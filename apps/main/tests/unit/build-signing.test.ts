import { describe, expect, test, vi } from 'vitest';
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
  resolveSigningPublicKey,
  armBuildProvenance,
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

describe('resolveSigningPublicKey', () => {
  const pair = generateKeyPairSync('ed25519');
  const privatePem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  test('prefers the public key, so the runtime never needs the private half', () => {
    // A private key that is NOT the pair's — if it were used, this would resolve to the wrong key.
    const other = generateKeyPairSync('ed25519');
    const otherPrivate = other.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const resolved = resolveSigningPublicKey(otherPrivate, publicPem);
    expect(resolved).toBeDefined();
    expect(resolved?.export({ type: 'spki', format: 'pem' }).toString()).toBe(publicPem);
  });

  test('falls back to deriving the public key from the private one', () => {
    const resolved = resolveSigningPublicKey(privatePem, '');
    expect(resolved?.export({ type: 'spki', format: 'pem' }).toString()).toBe(publicPem);
  });

  test('accepts the escaped single-line form for either key', () => {
    expect(resolveSigningPublicKey('', publicPem.replace(/\n/g, '\\n'))).toBeDefined();
    expect(resolveSigningPublicKey(privatePem.replace(/\n/g, '\\n'), '')).toBeDefined();
  });

  test('returns undefined when neither key is configured', () => {
    expect(resolveSigningPublicKey('', '')).toBeUndefined();
    expect(resolveSigningPublicKey('   ', '  ')).toBeUndefined();
  });
});

describe('armBuildProvenance (boot safety)', () => {
  const registrar = () => ({ registerKey: vi.fn() });

  test('a MALFORMED key returns unarmed with the reason and DOES NOT THROW', () => {
    // The regression this guards: a bad PEM thrown from the boot path killed the process with
    // ERR_OSSL_UNSUPPORTED. It must be a warning, never a crash.
    const verifier = registrar();
    let result: { armed: boolean; error?: string } | undefined;
    expect(() => {
      result = armBuildProvenance(verifier, 'key-1', 'not-a-pem', '');
    }).not.toThrow();
    expect(result?.armed).toBe(false);
    expect(result?.error).toBeTruthy();
    expect(verifier.registerKey).not.toHaveBeenCalled();
  });

  test('an empty key id arms nothing and touches nothing', () => {
    const verifier = registrar();
    expect(armBuildProvenance(verifier, '', 'x', 'y')).toEqual({ armed: false });
    expect(verifier.registerKey).not.toHaveBeenCalled();
  });

  test('no key material at all arms nothing, without an error', () => {
    expect(armBuildProvenance(registrar(), 'key-1', '', '')).toEqual({ armed: false });
  });

  test('a VALID public key arms the guard', () => {
    const pair = generateKeyPairSync('ed25519');
    const publicPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const verifier = registrar();
    expect(armBuildProvenance(verifier, 'key-1', '', publicPem)).toEqual({ armed: true });
    expect(verifier.registerKey).toHaveBeenCalledTimes(1);
  });

  test('a valid PRIVATE key still arms the guard (the builder path)', () => {
    const pair = generateKeyPairSync('ed25519');
    const privatePem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    expect(armBuildProvenance(registrar(), 'key-1', privatePem, '')).toEqual({ armed: true });
  });

  test('a verifier that rejects the key is caught, not propagated', () => {
    const verifier = {
      registerKey: () => {
        throw new Error('registry refused');
      },
    };
    const pair = generateKeyPairSync('ed25519');
    const publicPem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const result = armBuildProvenance(verifier, 'key-1', '', publicPem);
    expect(result.armed).toBe(false);
    expect(result.error).toBe('registry refused');
  });
});
