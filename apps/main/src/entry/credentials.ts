/**
 * Credentials Service entry point — Tier 2.
 *
 * The single shared issuance path for every runtime credential:
 *   - Swastik developer IDs (verify-only → Argon2id one-way hash)
 *   - Service-to-service tokens (in-process-readable → ADR-003 envelope
 *     encryption via `sealed_credentials`, never a one-way hash)
 *
 * Properties (blueprint.md §15, ADR-003):
 *   - Cryptographically random tokens (crypto.randomBytes).
 *   - Verify-only credentials are Argon2id-hashed at rest; credentials the
 *     system must read back are envelope-encrypted (root key → per-record DEK
 *     → AES-256-GCM). The boundary is enforced by `envelope-scope.ts`.
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

// The envelope hierarchy's only key-bearing consumer (blueprint §7504):
// ENCRYPTION_ROOT_KEY is decoded HERE and nowhere else; validation is
// fail-closed (exactly 32 bytes or the service refuses to start).
const rootKey = rootKeyFromBase64('local', env.ENCRYPTION_ROOT_KEY);
const sealedStore = new PostgresSealedCredentialStore(db.knex);
const sealedCredentialService = new SealedCredentialService(sealedStore, rootKey);

const app = Fastify({ logger: false });

registerInternalAuth(app, {
  expectedKey: env.INTERNAL_API_KEY,
});

/**
 * Issue a new credential.
 *
 * `readable: true` seals the credential with envelope encryption (the
 * system will present it later, so it must be readable back — ADR-003).
 * Otherwise the value is Argon2id-hashed at rest (verify-only), which is the
 * only scheme the at-rest boundary permits for it.
 *
 * NOTE (M9 finding): the verify-only arm currently persists against
 * `api_sessions` columns (`credentialHash`, `label`, `registeredBy`) that the
 * real migration 00029 (`userId`, `sessionTokenHash`, `expiresAt`) does not
 * define — a pre-existing defect, out of M8 scope, logged for the flaw pass.
 */
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
      // Plaintext returned exactly once; only the sealed envelope is stored.
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
    // Return plaintext exactly once.
    return reply.code(201).send({ id, token: plaintext, scheme: 'argon2id' });
  },
);

/** Read back a sealed (service-to-service) credential as plaintext for presentation. */
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

/** Revoke a sealed credential independently of verify-only credentials. */
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

/** Revoke a verify-only credential by ID. */
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
