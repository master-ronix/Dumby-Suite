/**
 * Credentials Service entry point — Tier 2.
 *
 * The single shared issuance path for every runtime credential:
 *   - Swastik developer IDs
 *   - Future service-to-service tokens
 *
 * Properties (blueprint.md §15):
 *   - Cryptographically random tokens (crypto.randomBytes).
 *   - Argon2id-hashed at rest (argon2 library — already a dependency).
 *   - Displayed exactly once, transmitted via Authorization header.
 *   - Independently revocable per credential.
 *   - Binds to CREDENTIALS_SERVICE_BIND_HOST only — never the public internet.
 */
import Fastify from 'fastify';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';

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

const app = Fastify({ logger: false });

/** Issue a new credential for a developer/service. Returns plaintext token ONCE. */
app.post<{ Body: { label: string; registeredBy: string } }>(
  '/credentials/issue',
  async (request, reply) => {
    const { label, registeredBy } = request.body;
    if (!label || !registeredBy) {
      return reply.code(400).send({ error: 'label and registeredBy are required' });
    }
    const plaintext = randomBytes(32).toString('hex');
    const hash = await argon2.hash(plaintext, { type: argon2.argon2id });
    const id = randomBytes(16).toString('hex');

    await db.knex('api_sessions').insert({
      id,
      credentialHash: hash,
      label,
      registeredBy,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('credential-issued', { id, label, registeredBy });
    // Return plaintext exactly once.
    return reply.code(201).send({ id, token: plaintext });
  },
);

/** Revoke a credential by ID. */
app.delete<{ Params: { id: string } }>('/credentials/:id', async (request, reply) => {
  const { id } = request.params;
  const rows = await db
    .knex('api_sessions')
    .where({ id })
    .update({ revokedAt: new Date(), updatedAt: new Date() });
  if (rows === 0) return reply.code(404).send({ error: 'Credential not found' });
  logger.info('credential-revoked', { id });
  return reply.code(204).send();
});

app
  .listen({ port: 8086, host: env.CREDENTIALS_SERVICE_BIND_HOST })
  .then(() => {
    logger.info('credentials-service-started', {
      host: env.CREDENTIALS_SERVICE_BIND_HOST,
      port: 8086,
    });
  })
  .catch((err: unknown) => {
    logger.fatal('credentials-service-start-failed', { error: String(err) });
    void db.destroy();
    process.exit(1);
  });
