import Fastify from 'fastify';
import { isMainEntry } from './is-main-entry.js';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { Redis } from 'ioredis';
import { PowerEngineDispatcher } from '../http/power-engine-dispatcher.js';
import { registerInternalAuth } from '../http/internal-auth.js';

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
  { trustedSources: ['pep-internal'] },
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

registerInternalAuth(app, {
  expectedKey: env.INTERNAL_API_KEY,
});

class PepActionNotImplementedError extends Error {
  constructor(functionName: string) {
    super(`PEP action "${functionName}" has no backing primitive implemented yet`);
    this.name = 'PepActionNotImplementedError';
  }
}

app.post<{ Params: { functionName: string }; Body: unknown }>(
  '/api/pep/:functionName',
  async (request, reply) => {
    const { functionName } = request.params;
    const body = (request.body ?? {}) as Record<string, unknown>;
    try {
      const outcome = await dispatcher.dispatch(
        functionName,
        {
          actorId: String(body['actorId'] ?? ''),
          source: 'pep-internal',
          reason: String(body['reason'] ?? ''),
        },
        async () => {
          throw new PepActionNotImplementedError(functionName);
        },
      );
      if (!outcome.ok) {
        return reply.code(403).send({
          error: {
            code: 'DUMBY_POWER_ENGINE_REJECTED',
            rejectionReason: outcome.rejectionReason,
          },
        });
      }
      return reply.code(501).send({
        error: {
          code: 'NOT_IMPLEMENTED',
          message: new PepActionNotImplementedError(functionName).message,
        },
      });
    } catch (err) {
      if (err instanceof PepActionNotImplementedError) {
        return reply.code(501).send({ error: { code: 'NOT_IMPLEMENTED', message: err.message } });
      }
      return reply.code(400).send({ error: String(err) });
    }
  },
);

if (isMainEntry(import.meta.url, process.argv[1])) {
  app
    .listen({ port: env.PEP_PORT, host: env.PEP_BIND_HOST })
    .then(() => {
      logger.info('pep-started', { port: env.PEP_PORT });
    })
    .catch((err: unknown) => {
      logger.fatal('pep-start-failed', { error: String(err) });
      void redis.quit();
      void db.destroy();
      process.exit(1);
    });
}
