import { describe, expect, test, vi } from 'vitest';
import pino from 'pino';
import argon2 from 'argon2';
import { InMemoryCredentialStore } from '../../src/db/repositories/credential.repository.js';
import { DeveloperCredentialService } from '../../src/credentials/developer-credential.service.js';
import { REDACT_PATHS } from '../../src/logging/logger.js';
import {
  CREDENTIAL_REFUSAL_BODY,
  CREDENTIAL_REFUSAL_STATUS,
} from '../../src/credentials/credential-refusal.js';
import {
  parseDeveloperCredential,
  authenticateDeveloperCredential,
} from '../../src/credentials/developer-bearer.js';
import { CredentialVerificationError } from '../../src/credentials/developer-credential.service.js';

describe('parseDeveloperCredential', () => {
  test('returns undefined for no header', () => {
    expect(parseDeveloperCredential(undefined)).toBeUndefined();
    expect(parseDeveloperCredential('')).toBeUndefined();
  });

  test('refuses bare devId tokens', () => {
    expect(parseDeveloperCredential('Bearer dev_123')).toBeUndefined();
  });

  test('refuses empty keyId or secret', () => {
    expect(parseDeveloperCredential('Bearer .secret')).toBeUndefined();
    expect(parseDeveloperCredential('Bearer key_.')).toBeUndefined();
  });

  test('refuses a secret that itself contains a second separator', () => {
    expect(parseDeveloperCredential('Bearer key_abc.sec.ret')).toBeUndefined();
  });

  test('parses keyId.secret correctly', () => {
    const result = parseDeveloperCredential('Bearer key_a1b2c3.secret_d4e5f6');
    expect(result).toEqual({ keyId: 'key_a1b2c3', secret: 'secret_d4e5f6' });
  });
});

describe('credential redaction', () => {
  function capture(fields: Record<string, unknown>): string {
    const chunks: string[] = [];
    const stream = {
      write: (chunk: string): void => {
        chunks.push(chunk);
        return true;
      },
    } as unknown as NodeJS.WritableStream;
    const instance = pino(
      {
        redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      },
      stream,
    );
    instance.info(fields, 'probe');
    return chunks.join('');
  }

  test('redacts a credential hash at the root', () => {
    expect(capture({ credentialHash: 'argon2-hash-value' })).not.toContain('argon2-hash-value');
  });

  test('redacts a devIdHash nested under a context object', () => {
    const out = capture({ ctx: { devIdHash: 'dev-hash-value' } });
    expect(out).not.toContain('dev-hash-value');
    expect(out).toContain('[REDACTED]');
  });

  test('redacts a secret nested inside a credential object', () => {
    const out = capture({ credential: { keyId: 'key_1', secret: 'plaintext-secret' } });
    expect(out).not.toContain('plaintext-secret');
  });

  test('still permits keyId, the operator correlation handle', () => {
    expect(capture({ keyId: 'key_abc123' })).toContain('key_abc123');
  });
});

describe('credential refusal body', () => {
  test('is frozen so no surface can add a field that names the failure', () => {
    expect(Object.isFrozen(CREDENTIAL_REFUSAL_BODY)).toBe(true);
    expect(Object.keys(CREDENTIAL_REFUSAL_BODY)).toHaveLength(0);
  });

  test('serialises to an empty object at status 401', () => {
    expect(CREDENTIAL_REFUSAL_STATUS).toBe(401);
    expect(JSON.stringify(CREDENTIAL_REFUSAL_BODY)).toBe('{}');
  });
});

describe('DeveloperCredentialService', () => {
  test('issue stores only hashes, never the raw secret or devId', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const issued = await service.issue({ purpose: 'devId', devId: 'dev_plaintext_abc' });
    const record = await store.findByKeyId(issued.keyId);
    expect(record).toBeDefined();
    expect(record?.credentialHash).not.toBe(issued.secret);
    expect(record?.devIdHash).not.toBe('dev_plaintext_abc');
    expect(record?.credentialHash).toMatch(/^\$argon2id\$/);
    expect(record?.devIdHash).toMatch(/^\$argon2id\$/);
  });

  test('verify succeeds for the issued keyId and secret', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const issued = await service.issue({ purpose: 'devId', devId: 'dev_1', status: 'active' });
    const result = await service.verify({ keyId: issued.keyId, secret: issued.secret });
    expect(result.keyId).toBe(issued.keyId);
    expect(result.purpose).toBe('devId');
    expect(result.status).toBe('active');
  });

  test('verify refuses an unknown keyId', async () => {
    const service = new DeveloperCredentialService(new InMemoryCredentialStore());
    await expect(service.verify({ keyId: 'key_missing', secret: 'x' })).rejects.toThrow(
      'invalid or missing credential',
    );
  });

  test('verify refuses a wrong secret', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const issued = await service.issue({ purpose: 'devId', status: 'active' });
    await expect(service.verify({ keyId: issued.keyId, secret: 'wrong' })).rejects.toThrow(
      'invalid or missing credential',
    );
  });

  test('verify refuses a revoked credential', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const issued = await service.issue({ purpose: 'devId', status: 'active' });
    await service.revoke(issued.keyId);
    await expect(service.verify({ keyId: issued.keyId, secret: issued.secret })).rejects.toThrow(
      'invalid or missing credential',
    );
  });

  test('verify refuses a pending credential', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const issued = await service.issue({ purpose: 'devId' });
    await expect(service.verify({ keyId: issued.keyId, secret: issued.secret })).rejects.toThrow(
      'invalid or missing credential',
    );
  });

  test('every refusal reason produces a byte-identical message', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const pending = await service.issue({ purpose: 'devId', devId: 'dev_1' });
    const active = await service.issue({ purpose: 'devId', devId: 'dev_2', status: 'active' });
    const revoked = await service.issue({ purpose: 'devId', devId: 'dev_3', status: 'active' });
    await service.revoke(revoked.keyId);

    const reasons: string[] = [];
    for (const attempt of [
      { keyId: 'key_missing', secret: 'x' },
      { keyId: active.keyId, secret: 'wrong' },
      { keyId: revoked.keyId, secret: revoked.secret },
      { keyId: pending.keyId, secret: pending.secret },
      { keyId: active.keyId, secret: active.secret, devId: 'dev_someone_else' },
    ]) {
      await service.verify(attempt).catch((err: unknown) => {
        reasons.push((err as CredentialVerificationError).message);
      });
    }
    expect(new Set(reasons).size).toBe(1);
    expect(reasons[0]).toBe('invalid or missing credential');
  });

  test('verifies a real argon2id hash end to end', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const issued = await service.issue({ purpose: 'devId', devId: 'dev_real', status: 'active' });
    const record = await store.findByKeyId(issued.keyId);
    expect(await argon2.verify(record!.credentialHash, issued.secret)).toBe(true);
    const result = await service.verify({
      keyId: issued.keyId,
      secret: issued.secret,
      devId: 'dev_real',
    });
    expect(result.keyId).toBe(issued.keyId);
  });

  test('refuses when the presented devId is not the one issued against', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const issued = await service.issue({ purpose: 'devId', devId: 'dev_owner', status: 'active' });
    await expect(
      service.verify({ keyId: issued.keyId, secret: issued.secret, devId: 'dev_attacker' }),
    ).rejects.toThrow('invalid or missing credential');
  });

  test('refuses a credential bound to no identity when a devId is presented', async () => {
    const store = new InMemoryCredentialStore();
    const service = new DeveloperCredentialService(store);
    const issued = await service.issue({ purpose: 'service_to_service', status: 'active' });
    await expect(
      service.verify({ keyId: issued.keyId, secret: issued.secret, devId: 'dev_x' }),
    ).rejects.toThrow('invalid or missing credential');
  });
});

describe('authenticateDeveloperCredential', () => {
  test('refuses when no credential presented', async () => {
    const outcome = await authenticateDeveloperCredential({
      authorization: undefined,
      verifier: {
        verify: vi.fn().mockResolvedValue({ keyId: 'k', purpose: 'devId', status: 'active' }),
      },
      findDeveloperByKeyId: vi.fn().mockResolvedValue({ devId: 'dev_x', credentialKeyId: 'k' }),
    });
    expect(outcome).toEqual({ ok: false, reason: 'no-credential-presented' });
  });

  test('verification passes and returns principal when bound', async () => {
    const dev = { devId: 'dev_abc', credentialKeyId: 'key_123', username: 'alice' };
    const verify = vi
      .fn()
      .mockResolvedValue({ keyId: 'key_123', purpose: 'devId', status: 'active' });
    const find = vi.fn().mockResolvedValue(dev);
    const outcome = await authenticateDeveloperCredential({
      authorization: 'Bearer key_123.s3cr3t',
      verifier: { verify },
      findDeveloperByKeyId: find,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.devId).toBe('dev_abc');
      expect(outcome.keyId).toBe('key_123');
      expect(outcome.dev).toBe(dev);
    }
    expect(verify).toHaveBeenCalledWith({ keyId: 'key_123', secret: 's3cr3t', devId: 'dev_abc' });
  });

  test('fails with same indistinguishable refusal reason when verify rejects', async () => {
    const verify = vi.fn().mockRejectedValue(new CredentialVerificationError('revoked-credential'));
    const outcome = await authenticateDeveloperCredential({
      authorization: 'Bearer key_123.s3cr3t',
      verifier: { verify },
      findDeveloperByKeyId: vi
        .fn()
        .mockResolvedValue({ devId: 'dev_x', credentialKeyId: 'key_123' }),
    });
    expect(outcome).toEqual({ ok: false, reason: 'revoked-credential', keyId: 'key_123' });
  });

  test('fails when credential not bound to any developer', async () => {
    const verify = vi
      .fn()
      .mockResolvedValue({ keyId: 'key_123', purpose: 'devId', status: 'active' });
    const outcome = await authenticateDeveloperCredential({
      authorization: 'Bearer key_123.s3cr3t',
      verifier: { verify },
      findDeveloperByKeyId: vi.fn().mockResolvedValue(undefined),
    });
    expect(outcome).toEqual({
      ok: false,
      reason: 'credential-not-bound-to-a-developer',
      keyId: 'key_123',
    });
  });
});
