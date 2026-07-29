/**
 * Swastik entry point — Tier 3 scaffold.
 *
 * Swastik is the framework's module deployment + hot-swap control-plane service.
 * Developer registration and build-tracking REST API are implemented here at
 * Tier-2 quality. Staging/promotion is against the LOCAL FILESYSTEM as a
 * documented stand-in for the Kubernetes-shared-volume mechanism a real
 * multi-pod deployment needs (blueprint.md §15.8).
 *
 * See apps/main/docs/adr/004-three-tier-scope.md for scope decisions.
 *
 * NOTE ON THE NAME: "Swastik" is a codename derived from a common given name,
 * used only because it is the term the source documents use throughout.
 * It is unrelated to any other association a reader might bring to the word.
 */
import Fastify from 'fastify';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';

const env = parseEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);

const db = new DbClient({
  connectionString: env.DATABASE_URL,
  poolMax: env.DATABASE_POOL_MAX,
  statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT,
  slowQueryThresholdMs: env.SLOW_QUERY_THRESHOLD_MS,
  criticalQueryThresholdMs: env.CRITICAL_QUERY_THRESHOLD_MS,
  logger,
});

const stagingVolume = env.SWASTIK_STAGING_VOLUME_PATH;
if (!existsSync(stagingVolume)) {
  mkdirSync(stagingVolume, { recursive: true });
}

const app = Fastify({ logger: false });

/** Register a new developer account. */
app.post<{ Body: { username: string; email: string } }>(
  '/swastik/developers',
  async (request, reply) => {
    const { username, email } = request.body;
    if (!username || !email) {
      return reply.code(400).send({ error: 'username and email are required' });
    }
    const devId = `dev_${randomBytes(8).toString('hex')}`;
    await db.knex('developers').insert({
      id: devId,
      username,
      email,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    logger.info('swastik-developer-registered', { devId, username });
    return reply.code(201).send({ devId });
  },
);

/** Submit a new module build for staging. */
app.post<{ Body: { devId: string; moduleName: string; version: string; buildPayload: string } }>(
  '/swastik/builds',
  async (request, reply) => {
    const { devId, moduleName, version, buildPayload } = request.body;
    if (!devId || !moduleName || !version || !buildPayload) {
      return reply.code(400).send({ error: 'devId, moduleName, version, and buildPayload are required' });
    }

    const buildId = `build_${randomBytes(8).toString('hex')}`;
    const stagingPath = join(stagingVolume, `${buildId}.json`);

    // Stage the build to local filesystem (stand-in for K8s shared volume).
    writeFileSync(stagingPath, buildPayload, 'utf8');

    await db.knex('builds').insert({
      id: buildId,
      devId,
      moduleName,
      version,
      stagingPath,
      status: 'staged',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('swastik-build-staged', { buildId, devId, moduleName, version });
    return reply.code(201).send({ buildId, status: 'staged' });
  },
);

app.listen({ port: env.SWASTIK_PORT, host: '127.0.0.1' })
  .then(() => {
    logger.info('swastik-started', { port: env.SWASTIK_PORT });
  })
  .catch((err: unknown) => {
    logger.fatal('swastik-start-failed', { error: String(err) });
    void db.destroy();
    process.exit(1);
  });
