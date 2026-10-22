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
import { signProvenance } from '../module-system/sign-provenance.js';
import {
  deploymentGateOutcome,
  handleDeployRequest,
  resolveModuleOwnership,
  runtimeLedger,
} from '../module-system/deploy-request.js';
import { PostgresBuildStore } from '../db/repositories/build.repository.js';
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
  transitionLicense,
} from '../licensing/license-machine.js';
import {
  approveLicenseRecord,
  licenseFromRow,
  PostgresLicenseStore,
} from '../licensing/license-store.js';
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
    connectTimeoutMs: env.DATABASE_CONNECT_TIMEOUT_MS,
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
  if (!existsSync(stagingVolume)) mkdirSync(stagingVolume, { recursive: true });
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
 * §44.8 / finding #8 — every deployment leaves a `deployment_records` row, so a deployment that
 * leaves no record did not happen. Failures here are logged, never fatal to the deploy itself.
 */
async function recordDeployment(input: {
  buildId: string;
  module: string;
  version: string;
  devId: string;
  promotionResult: PromotionResult;
}): Promise<void> {
  try {
    const store = new PostgresDeploymentRecordStore(db.knex);
    await store.append(
      buildDeploymentRecord({
        recordId: randomUUID(),
        triggeredBy: { type: 'operator', initiatedBy: input.devId },
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
  readonly devId: string;
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
  const devId = dev === undefined ? undefined : String(dev['devId']);
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
  const rawDevId = `dev_${randomBytes(16).toString('hex')}`;
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
  logger.info('swastik-developer-registered', { username, devId: redact(rawDevId) });
  await writeAudit('DEVELOPER_REGISTERED', 'allowed', { username, devId: redact(rawDevId) });
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

app.post('/swastik/modules/upload', async (request, reply) => {
  const principal = await authenticateDeveloper(request.headers.authorization, reply, 'upload');
  if (!principal) return reply;
  const devId = principal.devId;
  const dev = principal.dev;
  // UR-B-01: only an approved developer may upload. Refused as the same indistinguishable 401,
  // so the response cannot be used to probe approval state.
  if (dev['approvalStatus'] !== 'approved') {
    // §15.8: the attempt creates a pending approval request the owner reviews.
    await new PostgresApprovalStore(db.knex).requestPending('developer', devId);
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
      devId: redact(devId),
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
      devId: redact(devId),
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
      devId: redact(devId),
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
      devId: redact(devId),
    });
    return reply.code(403).send({ error: 'module is owned by another developer' });
  }
  const uploadGate = deploymentGateOutcome(await runtimeLedger(db.knex), moduleSlug);
  if (!uploadGate.allowed) {
    await writeAudit('BUILD_UPLOAD_REJECTED', 'rejected', {
      moduleSlug,
      version,
      devId: redact(devId),
      error: uploadGate.violations.join('; '),
    });
    return reply
      .code(409)
      .send({ error: `Compatibility Ledger refused staging: ${uploadGate.violations.join('; ')}` });
  }
  const buildId = `build_${randomBytes(12).toString('hex')}`;
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
  logger.info('swastik-build-staged', { buildId, moduleSlug, version, devId: redact(devId) });
  await writeAudit('BUILD_STAGED', 'allowed', {
    buildId,
    moduleSlug,
    version,
    devId: redact(devId),
  });
  return reply.code(201).send({ buildId, status: 'staged', moduleSlug, version });
});

app.get('/swastik/modules/:slug/builds/:buildId', async (request, reply) => {
  const { slug, buildId } = request.params as { slug: string; buildId: string };
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
    const signed =
      env.BUILD_SIGNING_KEY_ID !== '' && env.BUILD_SIGNING_PRIVATE_KEY !== ''
        ? signProvenance({
            stagingDir: verification.stagingDir,
            moduleSlug: moduleName,
            version: build.version,
            devId: build.devId,
            buildId: build.buildId,
            keyId: env.BUILD_SIGNING_KEY_ID,
            privateKey: env.BUILD_SIGNING_PRIVATE_KEY,
          })
        : undefined;
    promotion = await promoteUnderLock({
      lockStore: promotionLock,
      liveVolume: liveVolumeForTier(stagedManifest.tier),
      stagingVolume,
      moduleSlug: moduleName,
      stagingDir: verification.stagingDir,
      ...(signed !== undefined ? { provenance: signed.sidecar } : {}),
    });
    if (signed !== undefined) {
      await new PostgresBuildStore(db.knex).setProvenance({
        buildId: build.buildId,
        moduleSlug: moduleName,
        version: build.version,
        devId: build.devId,
        sourceArchiveHash: signed.sourceArchiveHash,
        artifactHash: signed.artifactHash,
        lockfileHash: signed.lockfileHash,
        gateResultsHash: signed.gateResultsHash,
        sbom: null,
        signature: signed.sidecar.signature,
        signatureKeyId: signed.sidecar.signatureKeyId,
        signedDescriptor: signed.sidecar.signedDescriptor,
      });
    }
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
  const result = await handleDeployRequest(
    {
      knex: db.knex,
      stagingVolume,
      modulesDir,
      lockStore: promotionLock,
      signingKeyId: env.BUILD_SIGNING_KEY_ID,
      signingPrivateKey: env.BUILD_SIGNING_PRIVATE_KEY,
      logger,
      redact,
      audit: writeAudit,
      recordDeployment,
    },
    request.body,
  );
  return reply.code(result.code).send(result.body);
});

/**
 * UR-20261021-095 — the owner approval gate. Registration creates a developer `pending` and a
 * license `pending`, but nothing could APPROVE the developer or ACTIVATE the license, so a
 * registered developer could never reach a deploy. These are owner-only, service-to-service routes:
 * the `/internal/*` prefix is INTERNAL_API_KEY-gated by the Swastik route policy, and each writes an
 * audit row. Approving a developer also activates their license (pending -> under-review ->
 * approved); declining revokes it.
 */
app.post<{ Params: { devId: string } }>(
  '/internal/developers/:devId/approve',
  async (request, reply) => {
    const { devId } = request.params;
    const body = (request.body ?? {}) as Record<string, unknown>;
    const actor = typeof body['approvedBy'] === 'string' ? body['approvedBy'] : 'operator';
    const dev = await db.knex('developers').where({ devId }).first();
    if (!dev) return reply.code(404).send({ error: 'no such developer' });

    await db.knex('developers').where({ devId }).update({
      approvalStatus: 'approved',
      approvedBy: actor,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    const licenseStore = new PostgresLicenseStore(db.knex);
    const license = await licenseStore.findBySubjectDevId(devId);
    let licenseState: string | null = null;
    if (license !== undefined) {
      const next = approveLicenseRecord(license, actor, 'developer approved');
      await licenseStore.save(next);
      licenseState = next.state;
    }

    logger.info('swastik-developer-approved', { devId: redact(devId), licenseState });
    await writeAudit('DEVELOPER_APPROVED', 'allowed', { devId: redact(devId), licenseState });
    return reply.send({ devId, approvalStatus: 'approved', licenseState });
  },
);

app.post<{ Params: { devId: string } }>(
  '/internal/developers/:devId/decline',
  async (request, reply) => {
    const { devId } = request.params;
    const body = (request.body ?? {}) as Record<string, unknown>;
    const actor = typeof body['decidedBy'] === 'string' ? body['decidedBy'] : 'operator';
    const reason = typeof body['reason'] === 'string' ? body['reason'] : 'declined by operator';
    const dev = await db.knex('developers').where({ devId }).first();
    if (!dev) return reply.code(404).send({ error: 'no such developer' });

    await db.knex('developers').where({ devId }).update({
      approvalStatus: 'declined',
      updatedAt: new Date(),
    });

    const licenseStore = new PostgresLicenseStore(db.knex);
    const license = await licenseStore.findBySubjectDevId(devId);
    let licenseState: string | null = null;
    if (license !== undefined && license.state !== 'revoked') {
      const next = transitionLicense(license, 'revoked', { actor, reason });
      await licenseStore.save(next);
      licenseState = next.state;
    }

    logger.info('swastik-developer-declined', { devId: redact(devId), licenseState });
    await writeAudit('DEVELOPER_DECLINED', 'rejected', { devId: redact(devId), reason });
    return reply.send({ devId, approvalStatus: 'declined', licenseState });
  },
);

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
