import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  rootKeyFromBase64,
  randomRootKey,
  seal,
  open,
  rotate,
  toBase64,
} from '../../src/crypto/envelope.js';
import {
  resolveCredentialTreatment,
  assertStorageTreatment,
  CREDENTIAL_TREATMENTS,
  BoundaryViolationError,
} from '../../src/crypto/envelope-scope.js';
import { InMemorySealedCredentialStore } from '../../src/db/repositories/sealed-credential.repository.js';
import {
  SealedCredentialService,
  SealedCredentialNotFoundError,
  SealedCredentialRevokedError,
  generateCredentialValue,
} from '../../src/credentials/sealed-credential.service.js';

function read(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), 'utf8');
}

describe('M8 — envelope encryption (ADR-003)', () => {
  describe('root key loading', () => {
    test('accepts exactly 32 decoded bytes', () => {
      const key = randomRootKey('root-a');
      expect(key.material.byteLength).toBe(32);
      const restored = rootKeyFromBase64('root-a', toBase64(key.material));
      expect(restored.id).toBe('root-a');
      expect(restored.material).toEqual(key.material);
    });

    test('rejects empty, non-base64, and wrong-length keys (fail-closed)', () => {
      expect(() => rootKeyFromBase64('k', '')).toThrow(/empty key material/);
      expect(() => rootKeyFromBase64('k', '!!not-base64!! is 24 chars')).toThrow();
      expect(() => rootKeyFromBase64('k', toBase64(new TextEncoder().encode('tooshort')))).toThrow(
        /expected 32 bytes/,
      );
    });

    test('the .env.example root key decodes to exactly 32 bytes', () => {
      const example = read('../../.env.example');
      const line = example.split('\n').find((line) => line.startsWith('ENCRYPTION_ROOT_KEY='));
      expect(line).toBeDefined();
      const value = line?.split('=')[1] ?? '';
      const key = rootKeyFromBase64('example', value);
      expect(key.material.byteLength).toBe(32);
    });
  });

  describe('seal / open round-trip', () => {
    test('seals and opens a plaintext credential', () => {
      const key = randomRootKey('root-a');
      const value = 'service-to-service-token-12345678901234567890';
      const record = seal(new TextEncoder().encode(value), key);
      expect(record.algorithm).toBe('AES-256-GCM');
      expect(record.kid).toBe('root-a');
      const opened = new TextDecoder().decode(open(record, key));
      expect(opened).toBe(value);
    });

    test('two seals of the same value never produce identical records', () => {
      const key = randomRootKey('root-a');
      const value = new TextEncoder().encode('same-value');
      const a = seal(value, key);
      const b = seal(value, key);
      expect(a.ciphertext).not.toBe(b.ciphertext);
      expect(a.wrapIv).not.toBe(b.wrapIv);
      expect(a.iv).not.toBe(b.iv);
    });

    test('tampering with the ciphertext fails closed', () => {
      const key = randomRootKey('root-a');
      const record = seal(new TextEncoder().encode('top-secret'), key);
      const flipped = Buffer.from(record.ciphertext, 'base64');
      flipped[0] ^= 0x01;
      record.ciphertext = flipped.toString('base64');
      expect(() => open(record, key)).toThrow(/authentication failed/);
    });

    test('opening under the wrong root key fails closed', () => {
      const record = seal(new TextEncoder().encode('value'), randomRootKey('root-a'));
      expect(() => open(record, randomRootKey('root-b'))).toThrow(/authentication failed/);
    });

    test('unknown algorithm is rejected', () => {
      const key = randomRootKey('root-a');
      const record = { ...seal(new TextEncoder().encode('value'), key), algorithm: 'ROT13' };
      expect(() => open(record, key)).toThrow(/unsupported algorithm/);
    });
  });

  describe('root key rotation (DEK re-wrap)', () => {
    test('rotation never touches record ciphertext and re-wraps the DEK', () => {
      const oldKey = randomRootKey('root-v1');
      const newKey = randomRootKey('root-v2');
      const value = 'credential-that-must-survive-rotation';
      const record = seal(new TextEncoder().encode(value), oldKey);
      const rotated = rotate(record, oldKey, newKey);

      expect(rotated.kid).toBe('root-v2');
      expect(rotated.iv).toBe(record.iv);
      expect(rotated.tag).toBe(record.tag);
      expect(rotated.ciphertext).toBe(record.ciphertext);
      expect(rotated.wrappedKey).not.toBe(record.wrappedKey);
      expect(rotated.wrapIv).not.toBe(record.wrapIv);

      expect(new TextDecoder().decode(open(rotated, newKey))).toBe(value);
      expect(() => open(rotated, oldKey)).toThrow(/authentication failed/);
    });
  });

  describe('ADR-003 boundary — envelope-scope guard', () => {
    test('verify-only resolves to one-way hash and refuses envelope storage', () => {
      expect(resolveCredentialTreatment({ purpose: 'verify-only' })).toBe(
        CREDENTIAL_TREATMENTS.hash,
      );
      expect(() =>
        resolveCredentialTreatment({ purpose: 'verify-only' }, CREDENTIAL_TREATMENTS.seal),
      ).toThrow(BoundaryViolationError);
    });

    test('in-process-readable resolves to envelope and refuses hashing', () => {
      expect(resolveCredentialTreatment({ purpose: 'in-process-readable' })).toBe(
        CREDENTIAL_TREATMENTS.seal,
      );
      expect(() =>
        resolveCredentialTreatment({ purpose: 'in-process-readable' }, CREDENTIAL_TREATMENTS.hash),
      ).toThrow(BoundaryViolationError);
    });

    test('unknown purposes and stored-mismatches are loud, never fallbacks', () => {
      expect(() => resolveCredentialTreatment({ purpose: 'unknown' as never })).toThrow(
        BoundaryViolationError,
      );
      expect(() =>
        assertStorageTreatment({ purpose: 'verify-only' }, CREDENTIAL_TREATMENTS.seal),
      ).toThrow(/at-rest treatment mismatch/);
      expect(() =>
        assertStorageTreatment({ purpose: 'in-process-readable' }, CREDENTIAL_TREATMENTS.hash),
      ).toThrow(/at-rest treatment mismatch/);
    });
  });

  describe('SealedCredentialService (in-memory store)', () => {
    test('issues a sealed credential and reads the plaintext back', async () => {
      const store = new InMemorySealedCredentialStore();
      const rootKey = randomRootKey('root-a');
      const service = new SealedCredentialService(store, rootKey);
      const issued = await service.issue('discord-bridge', 'operator-1', 's2s-token-abcdef');
      expect(issued.value).toBe('s2s-token-abcdef');
      expect(issued.envelope.kid).toBe('root-a');

      expect(await service.read(issued.credentialId)).toBe('s2s-token-abcdef');
      const stored = await store.findByCredentialId(issued.credentialId);
      expect(stored?.envelope.ciphertext).not.toContain('s2s-token');
    });

    test('generated credential values are cryptographically random', () => {
      expect(generateCredentialValue()).toMatch(/^[0-9a-f]{64}$/);
      expect(generateCredentialValue()).not.toBe(generateCredentialValue());
    });

    test('unknown credential and revoked credential refuse to read', async () => {
      const store = new InMemorySealedCredentialStore();
      const service = new SealedCredentialService(store, randomRootKey('root-a'));
      const issued = await service.issue('l', 'op', 'value');
      await service.revoke(issued.credentialId);

      await expect(service.read('does-not-exist')).rejects.toBeInstanceOf(
        SealedCredentialNotFoundError,
      );
      await expect(service.read(issued.credentialId)).rejects.toBeInstanceOf(
        SealedCredentialRevokedError,
      );
    });

    test('root-key rotation re-wraps every active credential and reads land on the new key', async () => {
      const oldKey = randomRootKey('root-v1');
      const nextKey = randomRootKey('root-v2');
      const store = new InMemorySealedCredentialStore();
      const service = new SealedCredentialService(store, oldKey);
      const a = await service.issue('a', 'op', 'value-a');
      const b = await service.issue('b', 'op', 'value-b');

      const ciphertextBeforeA = (await store.findByCredentialId(a.credentialId))?.envelope
        .ciphertext;

      await service.rotateRootKey(nextKey);

      const rotatedA = await store.findByCredentialId(a.credentialId);
      expect(rotatedA?.envelope.kid).toBe('root-v2');
      expect(rotatedA?.envelope.ciphertext).toBe(ciphertextBeforeA);

      const underNewKey = new SealedCredentialService(store, nextKey);
      expect(await underNewKey.read(a.credentialId)).toBe('value-a');
      expect(await underNewKey.read(b.credentialId)).toBe('value-b');

      const underOldKey = new SealedCredentialService(store, oldKey);
      await expect(underOldKey.read(a.credentialId)).rejects.toThrow();
    });
  });

  describe('structural gates — scope boundary exactly ADR-003', () => {
    test('env schema carries only the envelope root key and no borrowed JWT/key vars', () => {
      const schema = read('../../src/config/env.schema.ts');
      expect(schema).toContain('ENCRYPTION_ROOT_KEY');
      expect(schema).not.toMatch(/JWT_SIGNING_KEY:\s*z\./);
      expect(schema).not.toMatch(/ENCRYPTION_KEY_CURRENT:\s*z\./);
      expect(schema).not.toMatch(/ENCRYPTION_KEY_PREVIOUS:\s*z\./);
    });

    test('.env.example documents ENCRYPTION_ROOT_KEY and drops the retired vars', () => {
      const example = read('../../.env.example');
      expect(example).toContain('ENCRYPTION_ROOT_KEY');
      expect(example).not.toMatch(/^JWT_SIGNING_KEY/);
      expect(example).not.toMatch(/^ENCRYPTION_KEY_CURRENT/);
      expect(example).not.toMatch(/^ENCRYPTION_KEY_PREVIOUS/);
    });

    test('the sealed-credential table schema matches the envelope record layout', () => {
      const migration = read('../../src/db/migrations/20260101000035_create_sealed_credentials.ts');
      for (const column of [
        'sealedValue',
        'wrappedKey',
        'sealIv',
        'sealTag',
        'wrapIv',
        'wrapTag',
        'sealAlgorithm',
        'sealRootKeyId',
        'revokedAt',
      ]) {
        expect(migration).toContain(column);
      }
      expect(migration).toContain("table.uuid('id')");
    });

    test('credentials.ts wires the envelope hierarchy as the only key consumer', () => {
      const entry = read('../../src/entry/credentials.ts');
      expect(entry).toContain('ENCRYPTION_ROOT_KEY');
      expect(entry).toContain('rootKeyFromBase64');
      expect(entry).toContain('SealedCredentialService');
      expect(entry).toContain('sealedCredentialService');
      expect(entry).toContain('envelope');
    });

    test('the store and service expose the rotation path used by re-wrap', () => {
      const repo = read('../../src/db/repositories/sealed-credential.repository.ts');
      const service = read('../../src/credentials/sealed-credential.service.ts');
      expect(repo).toContain('updateEnvelope');
      expect(repo).toContain('PostgresSealedCredentialStore');
      expect(service).toContain('rotateRootKey');
      expect(service).toContain('assertStorageTreatment');
    });
  });
});
