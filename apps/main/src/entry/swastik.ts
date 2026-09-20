import Fastify from 'fastify';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  unlinkSync,
  readlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { parseEnv, pickEnvKeys, type Env } from '../config/env.schema.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { parseManifest, type ModuleManifest } from '../modules/manifest.schema.js';
import { constantTimeEqual } from '../shared/utils/crypto.js';
import { safeJoin } from '../shared/utils/path-guard.js';

let env: Env;
let logger: Logger;
let db: DbClient;
let stagingVolume: string;
let liveVolume: string;

async function init(): Promise<void> {
  env = parseEnv(pickEnvKeys(process.env));
  logger = createLogger(env.LOG_LEVEL);
  db = new DbClient({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL,
    poolMax: env.DATABASE_POOL_MAX,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
    slowQueryThresholdMs: env.SLOW_QUERY_THRESHOLD_MS,
    criticalQueryThresholdMs: env.CRITICAL_QUERY_THRESHOLD_MS,
    logger,
  });
  stagingVolume = env.SWASTIK_STAGING_VOLUME_PATH;
  liveVolume = env.SWASTIK_LIVE_VOLUME_PATH;
  if (!existsSync(stagingVolume)) mkdirSync(stagingVolume, { recursive: true });
  if (!existsSync(liveVolume)) mkdirSync(liveVolume, { recursive: true });
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
  const buildId = `build_${randomBytes(12).toString('hex')}`;
  const stagingDir = safeJoin(stagingVolume, `${moduleSlug}__${version}`);
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
  const { internalAuthHeader } = await import('../config/env.schema.js').catch(() => ({}));
  void internalAuthHeader;
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
  const moduleName = query['module'];
  if (!moduleName) return reply.code(400).send({ error: 'module query parameter is required' });
  const build = await db
    .knex('builds')
    .where({ moduleSlug: moduleName, validationStatus: 'pending' })
    .orderBy('createdAt', 'desc')
    .first();
  if (!build)
    return reply.code(404).send({ error: `no staged build found for module "${moduleName}"` });
  const versionDir = safeJoin(stagingVolume, `${moduleName}__${build.version}`);
  if (!existsSync(versionDir))
    return reply
      .code(404)
      .send({ error: `version directory not found for ${moduleName}@${build.version}` });
  const liveLink = safeJoin(liveVolume, moduleName);
  const rollbackLink = safeJoin(liveVolume, `${moduleName}__rollback`);
  let previousTarget: string | null = null;
  try {
    previousTarget = readlinkSync(liveLink);
  } catch {}
  try {
    if (existsSync(rollbackLink)) unlinkSync(rollbackLink);
    if (previousTarget) symlinkSync(previousTarget, rollbackLink);
    if (existsSync(liveLink)) unlinkSync(liveLink);
    symlinkSync(versionDir, liveLink);
    await db
      .knex('builds')
      .where({ buildId: build.buildId })
      .update({ validationStatus: 'passed', promotedAt: new Date(), updatedAt: new Date() });
    logger.info('swastik-build-promoted', {
      moduleName,
      version: build.version,
      buildId: build.buildId,
    });
    await writeAudit('BUILD_PROMOTED', 'allowed', {
      moduleName,
      version: build.version,
      buildId: build.buildId,
    });
    return reply.send({
      status: 'promoted',
      moduleName,
      version: build.version,
      buildId: build.buildId,
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
    if (previousTarget) {
      try {
        if (existsSync(liveLink)) unlinkSync(liveLink);
        symlinkSync(previousTarget, liveLink);
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
    devId?: string;
    manifest?: unknown;
    indexSource?: unknown;
  };
  const { indexSource } = body as { indexSource?: unknown };
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

  if (manifest.name !== moduleSlug) {
    return reply.code(422).send({ error: `manifest name mismatch` });
  }

  const dev = await db.knex('developers').where({ devId: providedDevId }).first();
  if (!dev) {
    const autoDevId = providedDevId;
    await db.knex('developers').insert({
      devId: autoDevId,
      username: `auto-${moduleSlug}`,
      approvalStatus: 'approved',
      approvedAt: new Date(),
      approvedBy: 'swastik-internal',
    });
    logger.info('swastik-auto-dev-created', { devId: redact(autoDevId), moduleSlug });
  }

  const buildId = `build_${randomBytes(12).toString('hex')}`;
  const stagingDir = safeJoin(stagingVolume, `${moduleSlug}__${version}`);
  if (!existsSync(stagingDir)) mkdirSync(stagingDir, { recursive: true });
  const manifestPath = join(stagingDir, 'manifest.json');
  const indexPath = join(stagingDir, 'index.js');
  writeFileSync(manifestPath, JSON.stringify(rawManifest, null, 2), 'utf8');
  writeFileSync(indexPath, indexSource, 'utf8');

  await db.knex('builds').insert({
    buildId,
    devId: providedDevId,
    moduleSlug,
    version,
    validationStatus: 'pending',
  });

  const liveLink = safeJoin(liveVolume, moduleSlug);
  const rollbackLink = safeJoin(liveVolume, `${moduleSlug}__rollback`);
  let previousTarget: string | null = null;
  try {
    previousTarget = readlinkSync(liveLink);
  } catch {}
  try {
    if (existsSync(rollbackLink)) unlinkSync(rollbackLink);
    if (previousTarget) symlinkSync(previousTarget, rollbackLink);
    if (existsSync(liveLink)) unlinkSync(liveLink);
    symlinkSync(stagingDir, liveLink);
    await db
      .knex('builds')
      .where({ buildId })
      .update({ validationStatus: 'passed', promotedAt: new Date(), updatedAt: new Date() });
    logger.info('swastik-module-deployed', { moduleSlug, version, buildId });
    await writeAudit('MODULE_DEPLOYED', 'allowed', {
      moduleSlug,
      version,
      buildId,
      devId: redact(providedDevId),
    });
    return reply.code(201).send({
      buildId,
      status: 'promoted',
      moduleSlug,
      version,
      manifest: rawManifest,
    });
  } catch (err) {
    logger.error('swastik-deploy-failed', { moduleSlug, version, error: String(err) });
    await writeAudit('MODULE_DEPLOY_FAILED', 'rejected', {
      moduleSlug,
      version,
      error: String(err),
    });
    if (previousTarget) {
      try {
        if (existsSync(liveLink)) unlinkSync(liveLink);
        symlinkSync(previousTarget, liveLink);
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
  });
});

export async function startSwastik(): Promise<void> {
  await init();
  await app.listen({ port: env.SWASTIK_PORT, host: '127.0.0.1' });
  logger.info('swastik-started', { port: env.SWASTIK_PORT, stagingVolume, liveVolume });
}

startSwastik().catch((err: unknown) => {
  try {
    if (logger) {
      logger.fatal('swastik-start-failed', { error: String(err) });
    } else {
      process.stderr.write(`FATAL swastik-start-failed: ${String(err)}\n`);
    }
    if (db) void db.destroy();
  } catch {
    process.stderr.write(`FATAL swastik-start-failed (dry): ${String(err)}\n`);
  }
  process.exit(1);
});
