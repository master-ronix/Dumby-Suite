import Fastify from 'fastify';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { DbClient } from '../db/client.js';
import { registerInternalAuth } from '../http/internal-auth.js';
import { rootKeyFromBase64 } from '../crypto/envelope.js';
import { PostgresSealedCredentialStore } from '../db/repositories/sealed-credential.repository.js';
import {
  generateCredentialValue,
  SealedCredentialService,
} from '../credentials/sealed-credential.service.js';

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

const rootKey = rootKeyFromBase64('local', env.ENCRYPTION_ROOT_KEY);
const sealedStore = new PostgresSealedCredentialStore(db.knex);
const sealedCredentialService = new SealedCredentialService(sealedStore, rootKey);

const app = Fastify({ logger: false });

registerInternalAuth(app, {
  expectedKey: env.INTERNAL_API_KEY,
});

app.post<{ Body: { label: string; registeredBy: string; readable?: boolean } }>(
  '/credentials/issue',
  async (request, reply) => {
    const { label, registeredBy, readable } = request.body;
    if (!label || !registeredBy) {
      return reply.code(400).send({ error: 'label and registeredBy are required' });
    }
    if (readable === true) {
      const value = generateCredentialValue();
      const issued = await sealedCredentialService.issue(label, registeredBy, value);
      logger.info('sealed-credential-issued', {
        id: issued.credentialId,
        label,
        registeredBy,
      });
      return reply
        .code(201)
        .send({ id: issued.credentialId, token: issued.value, scheme: 'envelope' });
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
    return reply.code(201).send({ id, token: plaintext, scheme: 'argon2id' });
  },
);

app.get<{ Params: { credentialId: string } }>(
  '/credentials/readable/:credentialId',
  async (request, reply) => {
    const { credentialId } = request.params;
    try {
      const value = await sealedCredentialService.read(credentialId);
      return reply.code(200).send({ value });
    } catch (err) {
      if (
        err instanceof Error &&
        ['SealedCredentialNotFoundError', 'SealedCredentialRevokedError'].includes(err.name)
      ) {
        return reply.code(404).send({ error: err.message });
      }
      throw err;
    }
  },
);

app.delete<{ Params: { credentialId: string } }>(
  '/credentials/readable/:credentialId',
  async (request, reply) => {
    const { credentialId } = request.params;
    const revoked = await sealedCredentialService.revoke(credentialId);
    if (!revoked) return reply.code(404).send({ error: 'Credential not found' });
    logger.info('sealed-credential-revoked', { id: credentialId });
    return reply.code(204).send();
  },
);

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
  .listen({ port: env.CREDENTIALS_SERVICE_PORT, host: env.CREDENTIALS_SERVICE_BIND_HOST })
  .then(() => {
    logger.info('credentials-service-started', {
      host: env.CREDENTIALS_SERVICE_BIND_HOST,
      port: env.CREDENTIALS_SERVICE_PORT,
    });
  })
  .catch((err: unknown) => {
    logger.fatal('credentials-service-start-failed', { error: String(err) });
    void db.destroy();
    process.exit(1);
  });
