import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as ed25519Sign,
  verify as ed25519Verify,
  type KeyObject,
} from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * §15.8 "Signed Build Provenance & Load-Time Verification" / §15.8.2 "Artifact–Source Hash
 * Binding". Every accepted build carries an Ed25519 signature over a canonical descriptor that
 * binds the exact deployed artifact bytes to the provenance tuple (moduleSlug, version, devId,
 * buildId, sourceArchiveHash, artifactHash, gateResultsHash). The loader re-derives the artifact
 * hash from disk and re-verifies the signature before every import, so an artifact swapped after
 * signing is rejected.
 *
 * Key custody (finding #21): the private key is held IN-PROCESS and sourced from configuration; it
 * is never persisted. `signing_keys` stays a public-key-only registry — no migration adds a
 * private-key column. This is what §15.8 sanctions while the key-ceremony work is deferred.
 */

export const BUILD_SIGNING_ALGORITHM = 'Ed25519';
export const HASH_ALGORITHM = 'sha256';
export const HASH_PREFIX = 'sha256:';
export const BUILD_PROVENANCE_SIDECAR = 'build-provenance.json';

/** The provenance tuple the signature is bound to (§15.8). */
export interface BuildProvenanceTuple {
  readonly moduleSlug: string;
  readonly version: string;
  readonly devId: string;
  readonly buildId: number;
  readonly sourceArchiveHash: string;
  readonly artifactHash: string;
  readonly gateResultsHash: string;
}

/** The signature and the exact bytes it covers. */
export interface SignedProvenance {
  readonly signature: string;
  readonly signatureKeyId: string;
  readonly signedDescriptor: string;
}

/** The on-disk sidecar that ties a promoted directory to a `builds` row (finding #22). */
export interface BuildProvenanceSidecar extends SignedProvenance {
  readonly buildId: number;
  readonly moduleSlug: string;
  readonly version: string;
  readonly devId: string;
  readonly sourceArchiveHash: string;
  readonly artifactHash: string;
  readonly lockfileHash: string;
  readonly gateResultsHash: string;
}

const DESCRIPTOR_FIELD_ORDER = [
  'moduleSlug',
  'version',
  'devId',
  'buildId',
  'sourceArchiveHash',
  'artifactHash',
  'gateResultsHash',
] as const satisfies readonly (keyof BuildProvenanceTuple)[];

// DER prefix for a PKCS#8-wrapped Ed25519 private key; the 32-byte seed follows it verbatim.
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

export class BuildSigningKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BuildSigningKeyError';
  }
}

export function hashBytes(bytes: Buffer | string): string {
  const buf = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : bytes;
  return HASH_PREFIX + createHash(HASH_ALGORITHM).update(buf).digest('hex');
}

export function hashFile(path: string): string {
  return hashBytes(readFileSync(path));
}

/**
 * Deterministic, field-ordered serialization of the provenance tuple. Field order is fixed (not
 * object-insertion order) so the bytes signed at Gate 5 and re-derived at load are identical.
 */
export function canonicalDescriptor(tuple: BuildProvenanceTuple): string {
  const ordered: Record<string, string> = {};
  for (const field of DESCRIPTOR_FIELD_ORDER) ordered[field] = String(tuple[field]);
  return JSON.stringify(ordered);
}

export class BuildSigner {
  readonly keyId: string;
  readonly #privateKey: KeyObject;
  readonly #publicKey: KeyObject;

  private constructor(keyId: string, privateKey: KeyObject) {
    if (keyId.trim().length === 0) {
      throw new BuildSigningKeyError('build signing keyId must not be empty');
    }
    this.keyId = keyId;
    this.#privateKey = privateKey;
    this.#publicKey = createPublicKey(privateKey);
  }

  static fromPrivateKey(keyId: string, privateKey: KeyObject): BuildSigner {
    return new BuildSigner(keyId, privateKey);
  }

  static fromPkcs8Pem(keyId: string, pem: string): BuildSigner {
    try {
      return new BuildSigner(keyId, createPrivateKey(pem));
    } catch (err) {
      throw new BuildSigningKeyError(
        `could not load the build signing private key: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Reconstruct an Ed25519 private key from its raw 32-byte seed (wrapped as PKCS#8 DER). */
  static fromSeed(keyId: string, seed: Buffer): BuildSigner {
    if (seed.length !== 32) {
      throw new BuildSigningKeyError('an Ed25519 seed must be exactly 32 bytes');
    }
    const der = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
    return new BuildSigner(keyId, createPrivateKey({ key: der, format: 'der', type: 'pkcs8' }));
  }

  get publicKeyPem(): string {
    return this.#publicKey.export({ type: 'spki', format: 'pem' }).toString();
  }

  signTuple(tuple: BuildProvenanceTuple): SignedProvenance {
    const descriptor = canonicalDescriptor(tuple);
    const signature = ed25519Sign(null, Buffer.from(descriptor, 'utf8'), this.#privateKey).toString(
      'base64',
    );
    return { signature, signatureKeyId: this.keyId, signedDescriptor: descriptor };
  }

  signSidecar(tuple: BuildProvenanceTuple, lockfileHash: string): BuildProvenanceSidecar {
    const signed = this.signTuple(tuple);
    return {
      buildId: tuple.buildId,
      moduleSlug: tuple.moduleSlug,
      version: tuple.version,
      devId: tuple.devId,
      sourceArchiveHash: tuple.sourceArchiveHash,
      artifactHash: tuple.artifactHash,
      lockfileHash,
      gateResultsHash: tuple.gateResultsHash,
      signature: signed.signature,
      signatureKeyId: signed.signatureKeyId,
      signedDescriptor: signed.signedDescriptor,
    };
  }
}

export class BuildSignatureVerifier {
  readonly #keys = new Map<string, KeyObject>();

  registerKey(keyId: string, publicKey: string | KeyObject): this {
    const key = typeof publicKey === 'string' ? createPublicKey(publicKey) : publicKey;
    this.#keys.set(keyId, key);
    return this;
  }

  hasKey(keyId: string): boolean {
    return this.#keys.has(keyId);
  }

  /**
   * Re-derive the descriptor from the tuple and verify the signature covers exactly those bytes.
   * Returns false — never throws — for an unknown key, a descriptor mismatch, or a bad signature.
   */
  verifyTuple(tuple: BuildProvenanceTuple, signed: SignedProvenance): boolean {
    const expected = canonicalDescriptor(tuple);
    if (signed.signedDescriptor !== expected) return false;
    const key = this.#keys.get(signed.signatureKeyId);
    if (key === undefined) return false;
    try {
      return ed25519Verify(
        null,
        Buffer.from(expected, 'utf8'),
        key,
        Buffer.from(signed.signature, 'base64'),
      );
    } catch {
      return false;
    }
  }
}

export function generateBuildSigningKeyPair(): {
  readonly signer: BuildSigner;
  readonly verifier: BuildSignatureVerifier;
  readonly keyId: string;
} {
  const keyId = `build-signing-${Date.now().toString(36)}`;
  const { privateKey } = generateKeyPairSync('ed25519');
  const signer = BuildSigner.fromPrivateKey(keyId, privateKey);
  const verifier = new BuildSignatureVerifier().registerKey(keyId, signer.publicKeyPem);
  return { signer, verifier, keyId };
}

const SIDECAR_STRING_FIELDS = [
  'buildId',
  'moduleSlug',
  'version',
  'devId',
  'sourceArchiveHash',
  'artifactHash',
  'lockfileHash',
  'gateResultsHash',
  'signature',
  'signatureKeyId',
  'signedDescriptor',
] as const;

function isSidecar(value: unknown): value is BuildProvenanceSidecar {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return SIDECAR_STRING_FIELDS.every((field) => typeof record[field] === 'string');
}

export function writeBuildProvenanceSidecar(
  moduleDir: string,
  sidecar: BuildProvenanceSidecar,
): string {
  const path = join(moduleDir, BUILD_PROVENANCE_SIDECAR);
  writeFileSync(path, JSON.stringify(sidecar, null, 2), 'utf8');
  return path;
}

export function readBuildProvenanceSidecar(moduleDir: string): BuildProvenanceSidecar | null {
  const path = join(moduleDir, BUILD_PROVENANCE_SIDECAR);
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return isSidecar(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function tupleFromSidecar(sidecar: BuildProvenanceSidecar): BuildProvenanceTuple {
  return {
    moduleSlug: sidecar.moduleSlug,
    version: sidecar.version,
    devId: sidecar.devId,
    buildId: sidecar.buildId,
    sourceArchiveHash: sidecar.sourceArchiveHash,
    artifactHash: sidecar.artifactHash,
    gateResultsHash: sidecar.gateResultsHash,
  };
}
