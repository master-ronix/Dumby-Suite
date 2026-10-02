import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  CREDENTIAL_STORE_INVENTORY,
  CREDENTIAL_TREATMENTS,
  verifyEnvelopeScope,
} from '../../src/crypto/envelope-scope.js';

function migrationSource(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../src/db/migrations/${name}`, import.meta.url)),
    'utf8',
  );
}

describe('M8 scope-boundary verification (ADR-003, E6 GOV-13)', () => {
  test('the actual credential inventory satisfies the boundary (no violations)', () => {
    expect(verifyEnvelopeScope(CREDENTIAL_STORE_INVENTORY)).toEqual([]);
  });

  test('a verify-only value stored as an envelope is a violation', () => {
    const violations = verifyEnvelopeScope([
      {
        name: 'credentials.credentialHash',
        purpose: { purpose: 'verify-only' },
        storedWith: CREDENTIAL_TREATMENTS.seal,
      },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('credentials.credentialHash');
  });

  test('an in-process-readable value stored under a hash is a violation', () => {
    const violations = verifyEnvelopeScope([
      {
        name: 'sealed_credentials.sealedValue',
        purpose: { purpose: 'in-process-readable' },
        storedWith: CREDENTIAL_TREATMENTS.hash,
      },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('sealed_credentials.sealedValue');
  });

  test('the credentials table stores hashes, never envelope columns', () => {
    const src = migrationSource('20260101000037_create_credentials.ts');
    expect(src).toMatch(/credentialHash/);
    expect(src).not.toMatch(/sealedValue|wrappedKey|sealIv/);
  });

  test('the sealed_credentials table stores an envelope, never a hash column', () => {
    const src = migrationSource('20260101000035_create_sealed_credentials.ts');
    expect(src).toMatch(/sealedValue/);
    expect(src).toMatch(/wrappedKey/);
    expect(src).not.toMatch(/credentialHash|devIdHash/);
  });

  test('the persona sealed token column is an envelope store', () => {
    const src = migrationSource('20260101000042_add_persona_sealed_token.ts');
    expect(src).toMatch(/botTokenSealed/);
  });
});
