import { test, expect } from 'vitest';
import { createPublicKey, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BuildSigner,
  BuildSignatureVerifier,
  generateBuildSigningKeyPair,
  hashBytes,
  canonicalDescriptor,
  writeBuildProvenanceSidecar,
  readBuildProvenanceSidecar,
  tupleFromSidecar,
  BuildSigningKeyError,
  HASH_PREFIX,
  normalizeSigningKey,
} from '../../src/module-system/build-signing.js';

const tuple = {
  moduleSlug: 'hello-world',
  version: '1.0.0',
  devId: 'dev1',
  buildId: 'b1',
  sourceArchiveHash: 'sha256:a',
  artifactHash: 'sha256:b',
  gateResultsHash: 'sha256:c',
};

test('hashBytes prefixes with the sha256 marker and is stable for string/bytes', () => {
  expect(hashBytes('x').startsWith(HASH_PREFIX)).toBe(true);
  expect(hashBytes(Buffer.from('x'))).toBe(hashBytes('x'));
});

test('canonicalDescriptor serialises the tuple in fixed field order', () => {
  expect(canonicalDescriptor(tuple)).toBe(
    JSON.stringify({
      moduleSlug: 'hello-world',
      version: '1.0.0',
      devId: 'dev1',
      buildId: 'b1',
      sourceArchiveHash: 'sha256:a',
      artifactHash: 'sha256:b',
      gateResultsHash: 'sha256:c',
    }),
  );
});

test('sign then verify round-trips; a tampered tuple fails', () => {
  const { signer, verifier } = generateBuildSigningKeyPair();
  const signed = signer.signTuple(tuple);
  expect(verifier.verifyTuple(tuple, signed)).toBe(true);
  expect(verifier.verifyTuple({ ...tuple, version: '2.0.0' }, signed)).toBe(false);
});

test('verifier returns false for unknown key, bad signature and descriptor mismatch', () => {
  const { signer, verifier } = generateBuildSigningKeyPair();
  const signed = signer.signTuple(tuple);
  const empty = new BuildSignatureVerifier();
  expect(empty.hasKey(signed.signatureKeyId)).toBe(false);
  expect(empty.verifyTuple(tuple, signed)).toBe(false);
  expect(
    verifier.verifyTuple(tuple, { ...signed, signature: Buffer.from('nope').toString('base64') }),
  ).toBe(false);
  expect(verifier.verifyTuple(tuple, { ...signed, signedDescriptor: 'other' })).toBe(false);
});

test('sidecar write/read round-trips and tupleFromSidecar maps back', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bs-'));
  try {
    const { signer } = generateBuildSigningKeyPair();
    const sidecar = signer.signSidecar(tuple, 'sha256:lock');
    writeBuildProvenanceSidecar(dir, sidecar);
    const read = readBuildProvenanceSidecar(dir);
    expect(read).not.toBeNull();
    expect(tupleFromSidecar(read!)).toStrictEqual(tuple);
    expect(read!.lockfileHash).toBe('sha256:lock');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readBuildProvenanceSidecar returns null when the sidecar is absent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bs-'));
  try {
    expect(readBuildProvenanceSidecar(dir)).toBeNull();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('BuildSigner validates key material', () => {
  expect(() => BuildSigner.fromSeed('', Buffer.alloc(32))).toThrow(BuildSigningKeyError);
  expect(() => BuildSigner.fromSeed('k', Buffer.alloc(5))).toThrow(BuildSigningKeyError);
  expect(() => BuildSigner.fromPkcs8Pem('k', 'not-a-pem')).toThrow(BuildSigningKeyError);
  const signer = BuildSigner.fromSeed('k', Buffer.alloc(32, 1));
  expect(signer.keyId).toBe('k');
  expect(signer.publicKeyPem).toContain('PUBLIC KEY');
});

// --- UR-20261012-035 — the configured key's escapes ---------------------------------------

describe('normalizeSigningKey', () => {
  const pem = (body: string): string =>
    `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;

  test('turns the escaped single-line form a hosting variable holds into real line breaks', () => {
    const singleLine = pem('ABC').replace(/\n/g, '\\n');
    expect(normalizeSigningKey(singleLine)).toBe(pem('ABC'));
  });

  test('leaves a value that already carries real newlines untouched', () => {
    expect(normalizeSigningKey(pem('ABC'))).toBe(pem('ABC'));
  });

  test('the normalised single-line form is a key Node will actually accept', () => {
    const { privateKey } = generateKeyPairSync('ed25519');
    const exported = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    // Before the fix this exact value failed with DECODER routines::unsupported.
    expect(() =>
      createPublicKey(normalizeSigningKey(exported.replace(/\n/g, '\\n'))),
    ).not.toThrow();
  });
});
