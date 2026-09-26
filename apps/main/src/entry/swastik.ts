import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Redis } from 'ioredis';
import { parseEnv, pickEnvKeys, type Env } from '../config/env.schema.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { RedisLockStore } from '../cache/redis-lock-store.js';
import { INTERNAL_API_HEADER } from '../http/internal-auth.js';
import { parseManifest, type ModuleManifest } from '../module-system/manifest.schema.js';
import { constantTimeEqual } from '../shared/utils/crypto.js';
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

let env: Env;
let logger: Logger;
let db: DbClient;
let modulesDir: string;
let stagingVolume: string;
let liveVolume: string;
let promotionLock: RedisLockStore;
let lockRedis: Redis;

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
  modulesDir = env.MODULES_DIR;
  stagingVolume = env.SWASTIK_STAGING_VOLUME_PATH;
  liveVolume = env.SWASTIK_LIVE_VOLUME_PATH;
  if (!existsSync(stagingVolume)) mkdirSync(stagingVolume, { recursive: true });
  if (!existsSync(liveVolume)) mkdirSync(liveVolume, { recursive: true });
}

/**
 * Tier-at-rest target for a promotion. A build is only ever promoted into the
 * tier volume its manifest declares (blueprint §15.8 / ADR-005), so a Core
 * build can never land in the Standard volume and vice versa; the bootstrap
 * tier-volume loader would reject such a placement anyway. The resolved path is
 * asserted to stay inside `MODULES_DIR`.
 */
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

function redact(value: string): string {
  return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***';
}

function safeModulePathSegment(moduleSlug: string, version: string): string {
  return `${assertSafeSlug(moduleSlug)}__${assertSafeVersion(version)}`;
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

/** Hydrates a license from the `licenses` row (optional fields omitted when absent). */
function licenseFromRow(row: Record<string, unknown>): LicenseRecord {
  const license: LicenseRecord = {
    licenseId: String(row['licenseId']),
    subjectDevId: String(row['subjectDevId']),
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

/**
 * Hydrates the runtime Compatibility Ledger from its tables (blueprint §14.4).
 * The ledger is the single source of truth for contract windows; it stands
 * empty-but-enforced from Phase 0 (directive D-8.10).
 */
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

/**
 * Modules declare their contract windows in the ledger itself, not the
 * manifest (the manifest schema carries no contract-window field). An empty
 * ledger therefore refuses nothing the runtime can evidence — but any window
 * the ledger does record over an unregistered contract refuses the deployment
 * (fail closed, D-8.10).
 */
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

app.post('/swastik/developers/register', async (request, reply) => {
  const body = request.body as Record<string, unknown>;
  const { username } = body as { username?: string };
  if (!username) {
    return reply.code(400).send({ error: 'username is required' });
  }
  const rawDevId = `dev_${randomBytes(16).toString('hex')}`;
  await db.knex('developers').insert({
    devId: rawDevId,
    username,
    approvalStatus: 'pending',
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
  return reply.code(201).send({ devId: rawDevId, approvalStatus: 'pending' });
});

app.get('/swastik/developers/me', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return reply.code(401).send({ error: 'missing or invalid Authorization header' });
  const devId = auth.slice(7);
  const dev = await db.knex('developers').where({ devId }).first();
  if (!dev) return reply.code(404).send({ error: 'developer not found' });
  return reply.send({ devId, username: dev.username, approvalStatus: dev.approvalStatus });
});

app.post('/swastik/modules/upload', async (request, reply) => {
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return reply.code(401).send({ error: 'missing or invalid Authorization header' });
  const devId = auth.slice(7);
  const dev = await db.knex('developers').where({ devId }).first();
  if (!dev) return reply.code(404).send({ error: 'developer not found' });
  if (dev.approvalStatus !== 'approved') {
    return reply
      .code(403)
      .send({ error: `developer not approved (status: ${dev.approvalStatus})` });
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
  if (manifest.devId && manifest.devId !== devId) {
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
  const uploadGate = deploymentGateOutcome(await runtimeLedger(), moduleSlug);
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
  const auth = request.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return reply.code(401).send({ error: 'missing or invalid Authorization header' });
  const devId = auth.slice(7);
  const build = await db.knex('builds').where({ buildId, devId, moduleSlug: slug }).first();
  if (!build) return reply.code(404).send({ error: 'build not found' });
  return reply.send({
    buildId: build.buildId,
    moduleSlug: build.moduleSlug,
    version: build.version,
    validationStatus: build.validationStatus,
    promotedAt: build.promotedAt,
  });
});

async function requireInternalKey(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const supplied = request.headers[INTERNAL_API_HEADER];
  const expected = env.INTERNAL_API_KEY;
  if (
    typeof supplied !== 'string' ||
    supplied.length === 0 ||
    !constantTimeEqual(supplied, expected)
  ) {
    await reply.code(401).send({ error: 'missing or invalid x-internal-api-key header' });
    return false;
  }
  return true;
}

app.post('/internal/reload', async (request, reply) => {
  if (!(await requireInternalKey(request, reply))) return;
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
  if (!(await requireInternalKey(request, reply))) return;
  const body = request.body as Record<string, unknown>;
  const {
    moduleSlug,
    version,
    devId: providedDevId,
    manifest: rawManifest,
  } = body as {
    moduleSlug?: string;
    version?: string;
    devId?: string;
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
      devId: redact(providedDevId),
      error: licenseViolations.join('; '),
    });
    return reply.code(403).send({ error: `license gate refused: ${licenseViolations.join('; ')}` });
  }
  const deployGate = deploymentGateOutcome(await runtimeLedger(), safeModuleSlug);
  if (!deployGate.allowed) {
    await writeAudit('MODULE_DEPLOY_REJECTED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: redact(providedDevId),
      error: deployGate.violations.join('; '),
    });
    return reply.code(409).send({
      error: `Compatibility Ledger refused deployment: ${deployGate.violations.join('; ')}`,
    });
  }

  const buildId = `build_${randomBytes(12).toString('hex')}`;
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
      devId: redact(providedDevId),
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
      devId: redact(providedDevId),
      gate: gate.gate,
      tier: manifest.tier,
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
      } catch {
        // rollback failure already logged above; nothing further to do
      }
    }
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
  await app.listen({ port: env.SWASTIK_PORT, host: '127.0.0.1' });
  logger.info('swastik-started', {
    port: env.SWASTIK_PORT,
    modulesDir,
    stagingVolume,
    liveVolume,
    tierVolumes: { ...TIER_VOLUME_NAMES },
  });
}

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
