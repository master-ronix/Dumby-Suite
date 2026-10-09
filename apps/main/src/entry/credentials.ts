import Fastify from 'fastify';
import { isMainEntry } from './is-main-entry.js';
import rateLimit from '@fastify/rate-limit';
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
import { PostgresCredentialStore } from '../db/repositories/credential.repository.js';
import {
  CredentialVerificationError,
  DeveloperCredentialService,
} from '../credentials/developer-credential.service.js';
import {
  CREDENTIAL_REFUSAL_BODY,
  CREDENTIAL_REFUSAL_STATUS,
} from '../credentials/credential-refusal.js';
import { PostgresIdentityIssuer } from '../identity/identity-issuer.js';

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
const credentialStore = new PostgresCredentialStore(db.knex);
// §15.6/§22.8 — the shared identity issuer: this service issues developer numbers here.
const identityIssuer = new PostgresIdentityIssuer(db.knex);
const credentialService = new DeveloperCredentialService(credentialStore, {
  issuer: identityIssuer,
});

const app = Fastify({ logger: false, bodyLimit: 4096 });

registerInternalAuth(app, {
  expectedKey: env.INTERNAL_API_KEY,
});

// §22.8: every caller of this service is rate limited. The default key generator is the source
// address, so the budget is per caller.
await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

async function writeAudit(fields: {
  actorId: string;
  action: string;
  reason: string;
  outcome: 'allowed' | 'rejected';
  rejectionReason?: string | undefined;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.knex('audit_logs').insert({
    actorId: fields.actorId,
    source: 'CREDENTIALS',
    action: fields.action,
    reason: fields.reason,
    outcome: fields.outcome,
    rejectionReason: fields.rejectionReason ?? null,
    metadata: fields.metadata ?? {},
  });
}

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
    const issued = await credentialService.issue({ purpose: 'service_to_service' });
    await writeAudit({
      actorId: registeredBy,
      action: 'credential.issue',
      reason: label,
      outcome: 'allowed',
      metadata: { purpose: issued.purpose, status: issued.status },
    });
    logger.info('credential-issued', { id: issued.keyId, label, registeredBy });
    return reply.code(201).send({ id: issued.keyId, token: issued.secret, scheme: 'argon2id' });
  },
);

app.post<{
  Body: { label?: string; registeredBy: string; status?: 'pending' | 'active' };
}>('/credentials/issue-devid', async (request, reply) => {
  const { label, registeredBy, status } = request.body;
  if (!registeredBy) {
    return reply.code(400).send({ error: 'registeredBy is required' });
  }
  // §15.6/§22.8 — the Credentials Service issues the developer's identity number; the caller
  // records what it is given rather than minting one itself.
  const devId = await credentialService.issueDeveloperId();
  const issued = await credentialService.issue({
    purpose: 'devId',
    devId,
    ...(status === undefined ? {} : { status }),
  });
  await writeAudit({
    actorId: registeredBy,
    action: 'credential.issue',
    reason: label ?? 'developer-registration',
    outcome: 'allowed',
    metadata: { purpose: issued.purpose, status: issued.status },
  });
  logger.info('developer-credential-issued', { id: issued.keyId, status: issued.status });
  return reply.code(201).send({
    devId,
    keyId: issued.keyId,
    secret: issued.secret,
    purpose: issued.purpose,
    status: issued.status,
  });
});

// §22.5/§22.8: Power Engine operator credentials (`purpose: 'operator_keypair'`) are issued here, bound to
// the named operator identity and started `active` — the independently-configured Power Engine operator
// allow-list is the approval, so no further owner approval is required for an operator credential.
app.post<{
  Body: { operatorId: string; registeredBy: string; label?: string };
}>('/credentials/issue-operator', async (request, reply) => {
  const { operatorId, registeredBy, label } = request.body;
  if (!operatorId || !registeredBy) {
    return reply.code(400).send({ error: 'operatorId and registeredBy are required' });
  }
  const issued = await credentialService.issue({
    purpose: 'operator_keypair',
    devId: operatorId,
    status: 'active',
  });
  await writeAudit({
    actorId: registeredBy,
    action: 'credential.issue',
    reason: label ?? 'operator-issuance',
    outcome: 'allowed',
    metadata: { purpose: issued.purpose, status: issued.status },
  });
  logger.info('operator-credential-issued', { id: issued.keyId });
  return reply.code(201).send({
    keyId: issued.keyId,
    secret: issued.secret,
    purpose: issued.purpose,
    status: issued.status,
  });
});

// §22.8: verification is delegated here and only here. A refusal names no field: the precise
// cause goes to the operator log, and the caller receives the shared refusal body.
app.post<{
  Body: { keyId: string; secret: string; devId?: number };
}>(
  '/credentials/verify',
  { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
  async (request, reply) => {
    const { keyId, secret, devId } = request.body;
    if (!keyId || !secret) {
      logger.warn('credential-verify-refused', { reason: 'malformed-request' });
      return reply.code(CREDENTIAL_REFUSAL_STATUS).send(CREDENTIAL_REFUSAL_BODY);
    }
    try {
      const verified = await credentialService.verify(
        devId === undefined ? { keyId, secret } : { keyId, secret, devId },
      );
      return reply.code(200).send({
        valid: true,
        purpose: verified.purpose,
        status: verified.status,
      });
    } catch (err) {
      const reason = err instanceof CredentialVerificationError ? err.reason : 'unexpected-error';
      logger.warn('credential-verify-refused', { reason, keyId });
      return reply.code(CREDENTIAL_REFUSAL_STATUS).send(CREDENTIAL_REFUSAL_BODY);
    }
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

// §15.8/§22.8: an owner approval transitions the developer's credential from `pending` to
// `active`. Verification refuses a `pending` credential, so this is the step that makes a
// registered developer usable end-to-end.
app.post<{ Params: { keyId: string } }>('/credentials/:keyId/activate', async (request, reply) => {
  const { keyId } = request.params;
  const activated = await credentialService.setStatus(keyId, 'active');
  if (!activated) return reply.code(404).send({ error: 'Credential not found' });
  await writeAudit({
    actorId: 'credentials-service',
    action: 'credential.activate',
    reason: 'owner approval',
    outcome: 'allowed',
    metadata: { keyId },
  });
  logger.info('credential-activated', { id: keyId });
  return reply.code(200).send({ keyId, status: 'active' });
});

app.delete<{ Params: { id: string } }>('/credentials/:id', async (request, reply) => {
  const { id } = request.params;
  const revoked = await credentialService.revoke(id);
  if (!revoked) return reply.code(404).send({ error: 'Credential not found' });
  await writeAudit({
    actorId: 'credentials-service',
    action: 'credential.revoke',
    reason: 'operator revoke',
    outcome: 'allowed',
  });
  logger.info('credential-revoked', { id });
  return reply.code(204).send();
});

if (isMainEntry(import.meta.url, process.argv[1])) {
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
}
