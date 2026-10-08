import Fastify, { type FastifyReply } from 'fastify';
import { isMainEntry } from './is-main-entry.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Redis } from 'ioredis';
import { parseEnv, pickEnvKeys, type Env } from '../config/env.schema.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { RedisLockStore } from '../cache/redis-lock-store.js';
import { registerInternalAuth, shouldProtectSwastikRoute } from '../http/internal-auth.js';
import { toErrorResponse } from '../http/error-boundary.js';
import { parseManifest, type ModuleManifest } from '../module-system/manifest.schema.js';
import {
  assertPathInside,
  assertSafeSlug,
  assertSafeVersion,
  safeJoin,
} from '../shared/utils/path-guard.js';
import { TIER_VOLUME_NAMES } from '../module-system/swastik-loader.js';
import type { ModuleTier } from '../module-system/tier-rules.js';
import {
  createPendingLicense,
  licenseAuthorizesDeploy,
  type LicenseRecord,
} from '../licensing/license-machine.js';
import {
  checkModuleDeployment,
  CompatibilityLedger,
  type GateOutcome,
  type LedgerContractRecord,
  type LedgerProvidesRecord,
  type LedgerWindowEntry,
} from '../licensing/compatibility-ledger.js';
import {
  decidePromotionGate,
  promoteUnderLock,
  rollbackPromotion,
  verifyStagedBuild,
  type PromotionOutcome,
} from '../module-system/promotion.js';
import { buildDeploymentRecord, type PromotionResult } from '../licensing/deployment-records.js';
import { PostgresDeploymentRecordStore } from '../db/repositories/deployment-record.repository.js';
import { HttpCredentialClient, type CredentialClient } from '../credentials/credential-client.js';
import {
  decideModuleOwnership,
  type ModuleOwnershipStore,
} from '../module-system/module-ownership.js';
import { PostgresModuleOwnershipStore } from '../db/repositories/module-ownership.repository.js';
import { PostgresApprovalStore } from '../db/repositories/approval.repository.js';
import { CredentialVerificationError } from '../credentials/developer-credential.service.js';
import {
  CREDENTIAL_REFUSAL_BODY,
  CREDENTIAL_REFUSAL_STATUS,
} from '../credentials/credential-refusal.js';

let env: Env;
let logger: Logger;
let db: DbClient;
let modulesDir: string;
let stagingVolume: string;
let liveVolume: string;
let promotionLock: RedisLockStore;
let lockRedis: Redis;
let credentialClient: CredentialClient;

async function init(): Promise<void> {
  env = parseEnv(pickEnvKeys(process.env));
  logger = createLogger(env.LOG_LEVEL);
  db = new DbClient({
    connectionString: env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
    slowQueryThresholdMs: env.SLOW_QUERY_THRESHOLD_MS,
    criticalQueryThresholdMs: env.CRITICAL_QUERY_THRESHOLD_MS,
    logger,
  });
  lockRedis = new Redis(env.REDIS_URL);
  promotionLock = new RedisLockStore(lockRedis);
  // §22.8: Swastik holds no developer credential material. It asks the Credentials Service to
  // verify (and, at registration, to issue) and acts only on that verdict.
  credentialClient = new HttpCredentialClient({
    baseUrl: env.CREDENTIALS_SERVICE_URL,
    internalApiKey: env.INTERNAL_API_KEY,
    timeoutMs: env.CREDENTIALS_SERVICE_TIMEOUT_MS,
  });
  modulesDir = env.MODULES_DIR;
  stagingVolume = env.SWASTIK_STAGING_VOLUME_PATH;
  liveVolume = env.SWASTIK_LIVE_VOLUME_PATH;
  if (!existsSync(stagingVolume)) mkdirSync(stagingVolume, { recursive: true });
  if (!existsSync(liveVolume)) mkdirSync(liveVolume, { recursive: true });
}

function liveVolumeForTier(tier: ModuleTier): string {
  const target = safeJoin(modulesDir, TIER_VOLUME_NAMES[tier]);
  assertPathInside(modulesDir, target);
  if (!existsSync(target)) mkdirSync(target, { recursive: true });
  return target;
}

async function writeAudit(
  action: string,
  outcome: 'allowed' | 'rejected',
  detail: Record<string, unknown>,
): Promise<void> {
  await db.knex('audit_logs').insert({
    actorId: 'swastik',
    source: 'SWASTIK',
    reason: action,
    action,
    outcome,
    rejectionReason: outcome === 'rejected' ? String(detail['error'] ?? 'unknown') : null,
    metadata: JSON.stringify(detail),
  });
}

/**
 * UR-007 — buildId is a number: the next build number. Swastik assigns a fresh one per accepted
 * version (§15.8); it is not a string.
 */
async function nextBuildNumber(): Promise<number> {
  const row = (await db.knex('builds').max('buildId as m').first()) as
    | { m?: number | string | null }
    | undefined;
  return Number(row?.m ?? 0) + 1;
}

/**
 * §44.8 / finding #8 — every deployment leaves a `deployment_records` row, so a deployment that
 * leaves no record did not happen. Failures here are logged, never fatal to the deploy itself.
 */
async function recordDeployment(input: {
  buildId: number;
  module: string;
  version: string;
  devId: number;
  promotionResult: PromotionResult;
}): Promise<void> {
  try {
    const store = new PostgresDeploymentRecordStore(db.knex);
    await store.append(
      buildDeploymentRecord({
        recordId: randomUUID(),
        triggeredBy: { type: 'operator', initiatedBy: String(input.devId) },
        devId: input.devId,
        buildId: input.buildId,
        module: input.module,
        version: input.version,
        validationOutcome: 'passed',
        gateOutcomes: { promotion: 'passed' },
        promotionResult: input.promotionResult,
      }),
    );
  } catch (err) {
    logger.warn('swastik-deployment-record-failed', {
      buildId: input.buildId,
      error: String(err),
    });
  }
}

function redact(value: string): string {
  return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***';
}
function safeModulePathSegment(moduleSlug: string, version: string): string {
  return `${assertSafeSlug(moduleSlug)}__${assertSafeVersion(version)}`;
}

interface DeveloperPrincipal {
  readonly devId: number;
  readonly keyId: string;
  readonly dev: Record<string, unknown>;
}

/**
 * Parses `Authorization: Bearer <keyId>.<secret>`. The devId is never a bearer token any more
 * (UR-B-05): it is an opaque identifier that appears in response bodies and manifests only.
 * Returns undefined for anything that is not exactly one keyId and one secret.
 */
function parseDeveloperCredential(
  authorization: string | undefined,
): { keyId: string; secret: string } | undefined {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const presented = authorization.slice('Bearer '.length);
  const separator = presented.indexOf('.');
  if (separator <= 0 || separator === presented.length - 1) return undefined;
  const keyId = presented.slice(0, separator);
  const secret = presented.slice(separator + 1);
  if (keyId.length === 0 || secret.length === 0 || secret.includes('.')) return undefined;
  return { keyId, secret };
}

/**
 * Authenticates a developer route. §22.8: a missing credential, an unknown keyId, a wrong
 * secret, a pending or revoked credential, a credential bound to another developer and a
 * developer row that no credential points at all are one indistinguishable 401. The precise
 * cause is written to the operator log and the audit trail, never to the caller.
 */
async function authenticateDeveloper(
  authorization: string | undefined,
  reply: FastifyReply,
  route: string,
): Promise<DeveloperPrincipal | undefined> {
  const presented = parseDeveloperCredential(authorization);
  if (!presented) {
    logger.warn('swastik-developer-auth-refused', { route, reason: 'no-credential-presented' });
    await writeAudit('DEVELOPER_AUTH_REFUSED', 'rejected', {
      route,
      error: 'no-credential-presented',
    });
    return reply.code(CREDENTIAL_REFUSAL_STATUS).send(CREDENTIAL_REFUSAL_BODY);
  }
  const dev = await db.knex('developers').where({ credentialKeyId: presented.keyId }).first();
  const devId = dev === undefined ? undefined : Number(dev['devId']);
  let reason: string;
  try {
    await credentialClient.verify(devId === undefined ? presented : { ...presented, devId });
  } catch (err) {
    reason = err instanceof CredentialVerificationError ? err.reason : 'unexpected-error';
    logger.warn('swastik-developer-auth-refused', { route, reason, keyId: presented.keyId });
    await writeAudit('DEVELOPER_AUTH_REFUSED', 'rejected', {
      route,
      keyId: redact(presented.keyId),
      error: reason,
    });
    return reply.code(CREDENTIAL_REFUSAL_STATUS).send(CREDENTIAL_REFUSAL_BODY);
  }
  if (dev === undefined || devId === undefined) {
    logger.warn('swastik-developer-auth-refused', {
      route,
      reason: 'credential-not-bound-to-a-developer',
      keyId: presented.keyId,
    });
    await writeAudit('DEVELOPER_AUTH_REFUSED', 'rejected', {
      route,
      keyId: redact(presented.keyId),
      error: 'credential-not-bound-to-a-developer',
    });
    return reply.code(CREDENTIAL_REFUSAL_STATUS).send(CREDENTIAL_REFUSAL_BODY);
  }
  return { devId, keyId: presented.keyId, dev: dev as Record<string, unknown> };
}

const OPTIONAL_LICENSE_FIELDS = [
  'approvedBy',
  'approvedAt',
  'suspendedBy',
  'suspendedAt',
  'suspensionReason',
  'forceDisabled',
  'restoredBy',
  'restoredAt',
  'revokedBy',
  'revokedAt',
  'revocationReason',
  'verifiedFingerprint',
] as const satisfies ReadonlyArray<keyof LicenseRecord>;

function licenseFromRow(row: Record<string, unknown>): LicenseRecord {
  const license: LicenseRecord = {
    licenseId: String(row['licenseId']),
    subjectDevId: Number(row['subjectDevId']),
    tierClass: row['tierClass'] as LicenseRecord['tierClass'],
    state: row['state'] as LicenseRecord['state'],
  };
  for (const key of OPTIONAL_LICENSE_FIELDS) {
    const value: unknown = row[key];
    if (typeof value === 'string' || typeof value === 'boolean') {
      (license as unknown as Record<string, string | boolean>)[key] = value;
    }
  }
  return license;
}

async function runtimeLedger(): Promise<CompatibilityLedger> {
  const contracts = (await db
    .knex('compatibility_contracts')
    .select('contractId', 'currentVersion')) as unknown as LedgerContractRecord[];
  const windows = (await db
    .knex('compatibility_windows')
    .select(
      'counterpart',
      'contractId',
      'minInclusive',
      'maxExclusive',
      'excluded',
    )) as unknown as Array<
    Omit<LedgerWindowEntry, 'window'> & {
      minInclusive: string;
      maxExclusive: string;
      excluded: unknown;
    }
  >;
  const provides = (await db
    .knex('compatibility_provides')
    .select('counterpart', 'contractId', 'version')) as unknown as LedgerProvidesRecord[];
  return CompatibilityLedger.fromJSON({
    formatVersion: 1,
    contracts,
    windows: windows.map((w): LedgerWindowEntry => ({
      counterpart: w.counterpart,
      contractId: w.contractId,
      window: {
        minInclusive: w.minInclusive,
        maxExclusive: w.maxExclusive,
        excluded: Array.isArray(w.excluded) ? (w.excluded as string[]) : [],
      },
    })),
    provides,
  });
}

function deploymentGateOutcome(ledger: CompatibilityLedger, moduleName: string): GateOutcome {
  return checkModuleDeployment(ledger, {
    moduleName,
    declaredWindows: ledger.windowsHeldBy(moduleName).map((entry) => ({
      contractId: entry.contractId,
      window: entry.window,
    })),
    coDeployedModuleNames: [],
  });
}

const app = Fastify({ logger: false });

const PATH_GUARD_REJECTION = 'rejected: module identifier is malformed or escapes the module root';

function isPathGuardRejection(err: unknown): err is { kind: string } {
  if (typeof err !== 'object' || err === null) return false;
  return (err as { name?: unknown }).name === 'PathGuardError';
}

app.setErrorHandler((err, _request, reply) => {
  if (isPathGuardRejection(err)) {
    logger.warn('swastik-path-guard-rejected', { kind: err.kind });
    return reply.code(400).send({ error: PATH_GUARD_REJECTION });
  }
  const { statusCode, body } = toErrorResponse(err);
  if (statusCode === 500) {
    logger.error('swastik-unhandled-error', { error: String(err) });
  }
  return reply.code(statusCode).send(body);
});

app.post('/swastik/developers/register', async (request, reply) => {
  const body = request.body as Record<string, unknown>;
  const { username } = body as { username?: string };
  if (!username) {
    return reply.code(400).send({ error: 'username is required' });
  }
  // devId is a number (UR-007): the next developer number, assigned at registration.
  const maxRow = (await db.knex('developers').max('devId as m').first()) as
    | { m?: number | string | null }
    | undefined;
  const rawDevId = Number(maxRow?.m ?? 0) + 1;
  // Issuance is delegated to the Credentials Service (§22.8). Swastik mints nothing: it receives
  // a keyId plus a secret shown exactly once and binds the keyId to the developer row.
  const issued = await credentialClient.issueDevId({ devId: rawDevId, registeredBy: username });
  await db.knex('developers').insert({
    devId: rawDevId,
    username,
    approvalStatus: 'pending',
    credentialKeyId: issued.keyId,
  });
  const pendingLicense = createPendingLicense(`lic_${randomBytes(16).toString('hex')}`, rawDevId);
  await db.knex('licenses').insert({
    licenseId: pendingLicense.licenseId,
    subjectDevId: pendingLicense.subjectDevId,
    tierClass: pendingLicense.tierClass,
    state: pendingLicense.state,
  });
  logger.info('swastik-developer-registered', { username, devId: redact(String(rawDevId)) });
  await writeAudit('DEVELOPER_REGISTERED', 'allowed', { username, devId: redact(String(rawDevId)) });
  return reply.code(201).send({
    devId: rawDevId,
    approvalStatus: 'pending',
    // The only time the secret is ever transmitted. It is stored only as an Argon2id hash and
    // is never logged (TABLE 22-D).
    credential: { keyId: issued.keyId, secret: issued.secret, format: '<keyId>.<secret>' },
  });
});

app.get('/swastik/developers/me', async (request, reply) => {
  const principal = await authenticateDeveloper(request.headers.authorization, reply, 'me');
  if (!principal) return reply;
  return reply.send({
    devId: principal.devId,
    username: principal.dev['username'],
    approvalStatus: principal.dev['approvalStatus'],
  });
});

async function resolveModuleOwnership(
  store: ModuleOwnershipStore,
  slug: string,
  devId: number,
): Promise<{ readonly allowed: boolean }> {
  const existing = await store.findBySlug(slug);
  const decision = decideModuleOwnership(existing, devId);
  if (decision.kind === 'denied') return { allowed: false };
  if (decision.kind === 'claim') await store.claim(slug, devId);
  return { allowed: true };
}

app.post('/swastik/modules/upload', async (request, reply) => {
  const principal = await authenticateDeveloper(request.headers.authorization, reply, 'upload');
  if (!principal) return reply;
  const devId = principal.devId;
  const dev = principal.dev;
  // UR-B-01: only an approved developer may upload. Refused as the same indistinguishable 401,
  // so the response cannot be used to probe approval state.
  if (dev['approvalStatus'] !== 'approved') {
    // §15.8: the attempt creates a pending approval request the owner reviews.
    await new PostgresApprovalStore(db.knex).requestPending('developer', String(devId));
    logger.warn('swastik-developer-auth-refused', {
      route: 'upload',
      reason: 'developer-not-approved',
      keyId: principal.keyId,
    });
    await writeAudit('DEVELOPER_AUTH_REFUSED', 'rejected', {
      route: 'upload',
      keyId: redact(principal.keyId),
      error: 'developer-not-approved',
    });
    return reply.code(CREDENTIAL_REFUSAL_STATUS).send(CREDENTIAL_REFUSAL_BODY);
  }
  const body = request.body as Record<string, unknown>;
  const {
    moduleSlug,
    version,
    manifest: rawManifest,
    indexSource,
  } = body as {
    moduleSlug?: string;
    version?: string;
    manifest?: unknown;
    indexSource?: unknown;
  };
  if (!moduleSlug || !version || !rawManifest) {
    return reply.code(400).send({ error: 'moduleSlug, version, and manifest are required' });
  }
  if (typeof indexSource !== 'string' || indexSource.trim().length === 0) {
    return reply
      .code(400)
      .send({ error: 'indexSource is required and must contain the compiled module package' });
  }
  let manifest: ModuleManifest;
  try {
    manifest = parseManifest(rawManifest);
  } catch (err) {
    await writeAudit('BUILD_UPLOAD_REJECTED', 'rejected', {
      moduleSlug,
      version,
      devId: redact(String(devId)),
      error: (err as Error).message,
    });
    return reply.code(422).send({
      error: `manifest validation failed: ${(err as Error).message}`,
      validationFailed: true,
    });
  }
  if (manifest.name !== moduleSlug) {
    return reply.code(422).send({
      error: `manifest name "${manifest.name}" does not match moduleSlug "${moduleSlug}"`,
    });
  }
  if (!manifest.devId) {
    return reply.code(422).send({ error: 'manifest devId is required (§15.6)' });
  }
  if (manifest.devId !== devId) {
    return reply.code(422).send({ error: 'manifest devId does not match authenticated developer' });
  }
  const licenseRow = await db.knex('licenses').where({ subjectDevId: devId }).first();
  if (!licenseRow) {
    await writeAudit('BUILD_UPLOAD_REJECTED', 'rejected', {
      moduleSlug,
      version,
      devId: redact(String(devId)),
      error: 'no license is registered for this developer',
    });
    return reply.code(403).send({ error: 'no license is registered for this developer' });
  }
  const licenseViolations = licenseAuthorizesDeploy(licenseFromRow(licenseRow), {
    manifestDevId: manifest.devId,
    moduleTier: manifest.tier,
  });
  if (licenseViolations.length > 0) {
    await writeAudit('BUILD_UPLOAD_REJECTED', 'rejected', {
      moduleSlug,
      version,
      devId: redact(String(devId)),
      error: licenseViolations.join('; '),
    });
    return reply.code(403).send({ error: `license gate refused: ${licenseViolations.join('; ')}` });
  }
  // UR-C-03 (§15.8): module ownership — claim a fresh slug, refuse a non-owner before staging.
  const uploadOwnership = await resolveModuleOwnership(
    new PostgresModuleOwnershipStore(db.knex),
    moduleSlug,
    devId,
  );
  if (!uploadOwnership.allowed) {
    await writeAudit('MODULE_UPLOAD_DENIED_NON_OWNER', 'rejected', {
      moduleSlug,
      version,
      devId: redact(String(devId)),
    });
    return reply.code(403).send({ error: 'module is owned by another developer' });
  }
  const uploadGate = deploymentGateOutcome(await runtimeLedger(), moduleSlug);
  if (!uploadGate.allowed) {
    await writeAudit('BUILD_UPLOAD_REJECTED', 'rejected', {
      moduleSlug,
      version,
      devId: redact(String(devId)),
      error: uploadGate.violations.join('; '),
    });
    return reply
      .code(409)
      .send({ error: `Compatibility Ledger refused staging: ${uploadGate.violations.join('; ')}` });
  }
  const buildId = await nextBuildNumber();
  const stagingDir = safeJoin(stagingVolume, safeModulePathSegment(moduleSlug, version));
  if (!existsSync(stagingDir)) mkdirSync(stagingDir, { recursive: true });
  const manifestPath = join(stagingDir, 'manifest.json');
  const indexPath = join(stagingDir, 'index.js');
  writeFileSync(manifestPath, JSON.stringify(rawManifest, null, 2), 'utf8');
  writeFileSync(indexPath, indexSource, 'utf8');
  await db.knex('builds').insert({
    buildId,
    devId,
    moduleSlug,
    version,
    validationStatus: 'pending',
  });
  logger.info('swastik-build-staged', { buildId, moduleSlug, version, devId: redact(String(devId)) });
  await writeAudit('BUILD_STAGED', 'allowed', {
    buildId,
    moduleSlug,
    version,
    devId: redact(String(devId)),
  });
  return reply.code(201).send({ buildId, status: 'staged', moduleSlug, version });
});

app.get('/swastik/modules/:slug/builds/:buildId', async (request, reply) => {
  const { slug, buildId } = request.params as { slug: string; buildId: number };
  const principal = await authenticateDeveloper(
    request.headers.authorization,
    reply,
    'build-status',
  );
  if (!principal) return reply;
  const build = await db
    .knex('builds')
    .where({ buildId, devId: principal.devId, moduleSlug: slug })
    .first();
  if (!build) return reply.code(404).send({ error: 'build not found' });
  return reply.send({
    buildId: build.buildId,
    moduleSlug: build.moduleSlug,
    version: build.version,
    validationStatus: build.validationStatus,
    promotedAt: build.promotedAt,
  });
});

app.post('/internal/reload', async (request, reply) => {
  const query = request.query as Record<string, string>;
  const moduleName = query['module'] ? assertSafeSlug(query['module']) : undefined;
  if (!moduleName) return reply.code(400).send({ error: 'module query parameter is required' });
  const build = await db
    .knex('builds')
    .where({ moduleSlug: moduleName, validationStatus: 'pending' })
    .orderBy('createdAt', 'desc')
    .first();
  if (!build)
    return reply.code(404).send({ error: `no staged build found for module "${moduleName}"` });
  const humanApproved = query['humanApproved'] === 'true';
  const verification = verifyStagedBuild({
    stagingVolume,
    moduleSlug: moduleName,
    version: build.version,
  });
  const stagedManifest = verification.manifest;
  if (!verification.ok || verification.stagingDir === undefined || stagedManifest === undefined) {
    await db
      .knex('builds')
      .where({ buildId: build.buildId })
      .update({ validationStatus: 'rejected', updatedAt: new Date() });
    await writeAudit('BUILD_LOAD_VERIFICATION_FAILED', 'rejected', {
      moduleName,
      version: build.version,
      buildId: build.buildId,
      error: verification.reason ?? 'staged build failed static verification',
    });
    return reply
      .code(422)
      .send({ error: verification.reason ?? 'staged build failed static verification' });
  }
  const priorPromotion = await db
    .knex('builds')
    .where({ moduleSlug: moduleName })
    .whereNotNull('promotedAt')
    .first();
  const gate = decidePromotionGate({
    isFirstPromotion: priorPromotion === undefined,
    humanApproved,
  });
  if (!gate.allowed) {
    await writeAudit('BUILD_PROMOTION_REFUSED', 'rejected', {
      moduleName,
      version: build.version,
      buildId: build.buildId,
      error: gate.reason,
    });
    return reply.code(403).send({ error: gate.reason });
  }
  let promotion: PromotionOutcome | null = null;
  try {
    promotion = await promoteUnderLock({
      lockStore: promotionLock,
      liveVolume: liveVolumeForTier(stagedManifest.tier),
      stagingVolume,
      moduleSlug: moduleName,
      stagingDir: verification.stagingDir,
    });
    await db
      .knex('builds')
      .where({ buildId: build.buildId })
      .update({ validationStatus: 'passed', promotedAt: new Date(), updatedAt: new Date() });
    logger.info('swastik-build-promoted', {
      moduleName,
      version: build.version,
      buildId: build.buildId,
      gate: gate.gate,
      tier: stagedManifest.tier,
    });
    await writeAudit('BUILD_PROMOTED', 'allowed', {
      moduleName,
      version: build.version,
      buildId: build.buildId,
      gate: gate.gate,
    });
    return reply.send({
      status: 'promoted',
      moduleName,
      version: build.version,
      buildId: build.buildId,
      gate: gate.gate,
      readyForHotSwap: true,
    });
  } catch (err) {
    logger.error('swastik-promotion-failed', {
      moduleName,
      version: build.version,
      error: String(err),
    });
    await writeAudit('BUILD_PROMOTION_FAILED', 'rejected', {
      moduleName,
      version: build.version,
      error: String(err),
    });
    if (promotion !== null) {
      try {
        rollbackPromotion(promotion);
        await db
          .knex('builds')
          .where({ buildId: build.buildId })
          .update({ validationStatus: 'rejected', promotedAt: null, updatedAt: new Date() });
        logger.warn('swastik-build-rolled-back', {
          moduleName,
          version: build.version,
          buildId: build.buildId,
        });
        await writeAudit('BUILD_ROLLED_BACK', 'allowed', {
          moduleName,
          version: build.version,
          buildId: build.buildId,
        });
      } catch (rollbackErr) {
        logger.error('swastik-rollback-failed', { moduleName, error: String(rollbackErr) });
      }
    }
    return reply.code(500).send({ error: `promotion failed: ${(err as Error).message}` });
  }
});

app.post('/internal/deploy', async (request, reply) => {
  const body = request.body as Record<string, unknown>;
  const {
    moduleSlug,
    version,
    devId: providedDevId,
    manifest: rawManifest,
  } = body as {
    moduleSlug?: string;
    version?: string;
    devId?: number;
    manifest?: unknown;
    indexSource?: unknown;
  };
  const { indexSource, humanApproved: humanApprovedRaw } = body as {
    indexSource?: unknown;
    humanApproved?: unknown;
  };
  const humanApproved = humanApprovedRaw === true;
  if (!moduleSlug || !version || !providedDevId || !rawManifest) {
    return reply.code(400).send({ error: 'moduleSlug, version, devId, and manifest are required' });
  }
  if (typeof indexSource !== 'string' || indexSource.trim().length === 0) {
    return reply
      .code(400)
      .send({ error: 'indexSource is required and must contain the compiled module package' });
  }

  let manifest: ModuleManifest;
  try {
    manifest = parseManifest(rawManifest);
  } catch (err) {
    return reply.code(422).send({ error: `manifest validation failed: ${(err as Error).message}` });
  }

  const safeModuleSlug = assertSafeSlug(moduleSlug);
  const safeModuleVersion = assertSafeVersion(version);

  if (manifest.name !== safeModuleSlug) {
    return reply.code(422).send({ error: `manifest name mismatch` });
  }
  if (manifest.version !== safeModuleVersion) {
    return reply.code(422).send({ error: `manifest version mismatch` });
  }
  if (manifest.devId && manifest.devId !== providedDevId) {
    return reply.code(422).send({ error: 'manifest devId does not match provided developer' });
  }

  const dev = await db.knex('developers').where({ devId: providedDevId }).first();
  if (!dev) {
    return reply.code(403).send({ error: 'developer is not registered for deployment' });
  }
  if (dev.approvalStatus !== 'approved') {
    // §15.8: the attempt creates a pending approval request the owner reviews.
    await new PostgresApprovalStore(db.knex).requestPending('developer', String(providedDevId));
    await writeAudit('DEVELOPER_DEPLOY_DENIED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: redact(String(providedDevId)),
    });
    return reply
      .code(403)
      .send({ error: `developer not approved (status: ${dev.approvalStatus})` });
  }

  const licenseRow = await db.knex('licenses').where({ subjectDevId: providedDevId }).first();
  if (!licenseRow) {
    return reply.code(403).send({ error: 'no license is registered for this developer' });
  }
  const licenseViolations = licenseAuthorizesDeploy(licenseFromRow(licenseRow), {
    manifestDevId: manifest.devId,
    moduleTier: manifest.tier,
  });
  if (licenseViolations.length > 0) {
    await writeAudit('MODULE_DEPLOY_REJECTED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: redact(String(providedDevId)),
      error: licenseViolations.join('; '),
    });
    return reply.code(403).send({ error: `license gate refused: ${licenseViolations.join('; ')}` });
  }
  // UR-C-03 (§15.8): module ownership applies to deploy as well as upload.
  const deployOwnership = await resolveModuleOwnership(
    new PostgresModuleOwnershipStore(db.knex),
    safeModuleSlug,
    providedDevId,
  );
  if (!deployOwnership.allowed) {
    await writeAudit('MODULE_DEPLOY_DENIED_NON_OWNER', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: redact(String(providedDevId)),
    });
    return reply.code(403).send({ error: 'module is owned by another developer' });
  }
  const deployGate = deploymentGateOutcome(await runtimeLedger(), safeModuleSlug);
  if (!deployGate.allowed) {
    await writeAudit('MODULE_DEPLOY_REJECTED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: redact(String(providedDevId)),
      error: deployGate.violations.join('; '),
    });
    return reply.code(409).send({
      error: `Compatibility Ledger refused deployment: ${deployGate.violations.join('; ')}`,
    });
  }

  const buildId = await nextBuildNumber();
  const stagingDir = safeJoin(
    stagingVolume,
    safeModulePathSegment(safeModuleSlug, safeModuleVersion),
  );
  if (!existsSync(stagingDir)) mkdirSync(stagingDir, { recursive: true });
  const manifestPath = join(stagingDir, 'manifest.json');
  const indexPath = join(stagingDir, 'index.js');
  writeFileSync(manifestPath, JSON.stringify(rawManifest, null, 2), 'utf8');
  writeFileSync(indexPath, indexSource, 'utf8');

  await db.knex('builds').insert({
    buildId,
    devId: providedDevId,
    moduleSlug: safeModuleSlug,
    version: safeModuleVersion,
    validationStatus: 'pending',
  });

  const verification = verifyStagedBuild({
    stagingVolume,
    moduleSlug: safeModuleSlug,
    version: safeModuleVersion,
  });
  if (!verification.ok || verification.stagingDir === undefined) {
    await db
      .knex('builds')
      .where({ buildId })
      .update({ validationStatus: 'rejected', updatedAt: new Date() });
    await writeAudit('BUILD_LOAD_VERIFICATION_FAILED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      buildId,
      error: verification.reason ?? 'staged build failed static verification',
    });
    return reply
      .code(422)
      .send({ error: verification.reason ?? 'staged build failed static verification' });
  }
  const priorPromotion = await db
    .knex('builds')
    .where({ moduleSlug: safeModuleSlug })
    .whereNotNull('promotedAt')
    .first();
  const gate = decidePromotionGate({
    isFirstPromotion: priorPromotion === undefined,
    humanApproved,
  });
  if (!gate.allowed) {
    await writeAudit('BUILD_PROMOTION_REFUSED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      buildId,
      devId: redact(String(providedDevId)),
      error: gate.reason,
    });
    return reply.code(403).send({ error: gate.reason });
  }

  let promotion: PromotionOutcome | null = null;
  try {
    promotion = await promoteUnderLock({
      lockStore: promotionLock,
      liveVolume: liveVolumeForTier(manifest.tier),
      stagingVolume,
      moduleSlug: safeModuleSlug,
      stagingDir: verification.stagingDir,
    });
    await db
      .knex('builds')
      .where({ buildId })
      .update({ validationStatus: 'passed', promotedAt: new Date(), updatedAt: new Date() });
    logger.info('swastik-module-deployed', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      buildId,
      gate: gate.gate,
      tier: manifest.tier,
      liveVolume: TIER_VOLUME_NAMES[manifest.tier],
    });
    await writeAudit('MODULE_DEPLOYED', 'allowed', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      buildId,
      devId: redact(String(providedDevId)),
      gate: gate.gate,
      tier: manifest.tier,
    });
    await recordDeployment({
      buildId,
      module: safeModuleSlug,
      version: safeModuleVersion,
      devId: Number(providedDevId),
      promotionResult: 'promoted',
    });
    return reply.code(201).send({
      buildId,
      status: 'promoted',
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      gate: gate.gate,
      tier: manifest.tier,
      liveVolume: TIER_VOLUME_NAMES[manifest.tier],
      manifest: rawManifest,
    });
  } catch (err) {
    logger.error('swastik-deploy-failed', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      error: String(err),
    });
    await writeAudit('MODULE_DEPLOY_FAILED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      error: String(err),
    });
    if (promotion !== null) {
      try {
        rollbackPromotion(promotion);
        await db
          .knex('builds')
          .where({ buildId })
          .update({ validationStatus: 'rejected', promotedAt: null, updatedAt: new Date() });
      } catch {}
    }
    await recordDeployment({
      buildId,
      module: safeModuleSlug,
      version: safeModuleVersion,
      devId: Number(providedDevId),
      promotionResult: promotion !== null ? 'rolled-back' : 'not-attempted',
    });
    return reply.code(500).send({ error: `deploy failed: ${(err as Error).message}` });
  }
});

app.get('/swastik/status', async (_request, reply) => {
  const devCount = await db.knex('developers').count<{ count: string }>('devId as count').first();
  const buildCount = await db.knex('builds').count<{ count: string }>('buildId as count').first();
  const pendingDevs = await db
    .knex('developers')
    .where({ approvalStatus: 'pending' })
    .count<{ count: string }>('devId as count')
    .first();
  const passedBuilds = await db
    .knex('builds')
    .where({ validationStatus: 'passed' })
    .count<{ count: string }>('buildId as count')
    .first();
  return reply.send({
    status: 'running',
    developers: { total: Number(devCount?.count ?? 0), pending: Number(pendingDevs?.count ?? 0) },
    builds: { total: Number(buildCount?.count ?? 0), passed: Number(passedBuilds?.count ?? 0) },
    stagingVolume,
    liveVolume,
    tierVolumes: { ...TIER_VOLUME_NAMES },
  });
});

export async function startSwastik(): Promise<void> {
  await init();
  // Registered after init() because the expected key comes from parsed env, which init() assigns.
  // Registering at module scope would capture an undefined key before init() has run.
  registerInternalAuth(app, {
    expectedKey: env.INTERNAL_API_KEY,
    shouldProtect: shouldProtectSwastikRoute,
    audit: (outcome, detail) => {
      // §15.8 requires an INTERNAL_AUTH_DENIED audit row on rejection, recording the route and
      // the caller's address but never the presented key. Allowed requests are logged only: an
      // audit_logs row per authenticated call would add DB load the spec does not ask for, and
      // matches the admin gate's pattern in http/server.ts.
      if (outcome !== 'rejected') {
        logger.debug('swastik-internal-auth-allowed', detail);
        return undefined;
      }
      logger.warn('swastik-internal-auth-rejected', detail);
      return writeAudit('INTERNAL_AUTH_DENIED', 'rejected', { ...detail });
    },
  });
  await app.listen({ port: env.SWASTIK_PORT, host: env.SWASTIK_BIND_HOST });
  logger.info('swastik-started', {
    port: env.SWASTIK_PORT,
    modulesDir,
    stagingVolume,
    liveVolume,
    tierVolumes: { ...TIER_VOLUME_NAMES },
  });
}

if (isMainEntry(import.meta.url, process.argv[1])) {
  startSwastik().catch((err: unknown) => {
    try {
      if (logger) {
        logger.fatal('swastik-start-failed', { error: String(err) });
      } else {
        process.stderr.write(`FATAL swastik-start-failed: ${String(err)}\n`);
      }
      if (lockRedis) void lockRedis.quit();
      if (db) void db.destroy();
    } catch {
      process.stderr.write(`FATAL swastik-start-failed (dry): ${String(err)}\n`);
    }
    process.exit(1);
  });
}
