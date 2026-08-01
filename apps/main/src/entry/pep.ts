/**
 * Power Engine Panel (PEP) entry point — Tier 2.
 * Starts the PEP-only Fastify server on PEP_PORT.
 * Shares the same PostgreSQL and Redis instance as the main bot process.
 *
 * This is a separately-deployed process; it never imports the module
 * registry or gateway client.
 */
import Fastify from 'fastify';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { Redis } from 'ioredis';
import { PowerEngineDispatcher } from '../http/power-engine-dispatcher.js';

const env = parseEnv(pickEnvKeys(process.env));
const logger = createLogger(env.LOG_LEVEL);

const db = new DbClient({
  connectionString: env.DATABASE_URL,
  poolMax: env.DATABASE_POOL_MAX,
  statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
  slowQueryThresholdMs: env.SLOW_QUERY_THRESHOLD_MS,
  criticalQueryThresholdMs: env.CRITICAL_QUERY_THRESHOLD_MS,
  logger,
});

const redis = new Redis(env.REDIS_URL);

const dispatcher = new PowerEngineDispatcher(
  { trustedSources: env.PEP_TRUSTED_SOURCES },
  {
    write: async (entry) => {
      await db.knex('audit_logs').insert({
        actorId: entry.actorId,
        source: entry.source,
        reason: entry.reason,
        action: entry.action,
        outcome: entry.outcome,
        rejectionReason: entry.rejectionReason ?? null,
        metadata: JSON.stringify({}),
      });
    },
  },
);

const app = Fastify({ logger: false });

app.post<{ Params: { functionName: string }; Body: unknown }>(
  '/api/pep/:functionName',
  async (request, reply) => {
    const { functionName } = request.params;
    const body = request.body as Record<string, unknown>;
    try {
      const req = {
        actorId: String(body['actorId'] ?? ''),
        source: String(body['source'] ?? ''),
        reason: String(body['reason'] ?? ''),
      };
      const result = await dispatcher.dispatch(functionName, req, async () => body);
      return reply.code(200).send(result);
    } catch (err) {
      return reply.code(400).send({ error: String(err) });
    }
  },
);

app
  .listen({ port: env.PEP_PORT, host: '127.0.0.1' })
  .then(() => {
    logger.info('pep-started', { port: env.PEP_PORT });
  })
  .catch((err: unknown) => {
    logger.fatal('pep-start-failed', { error: String(err) });
    void redis.quit();
    void db.destroy();
    process.exit(1);
  });
