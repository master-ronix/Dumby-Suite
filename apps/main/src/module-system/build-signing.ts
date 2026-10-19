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

/**
 * UR-20261012-035 — normalises a configured signing key.
 *
 * The key arrives from configuration, and a hosting variable is a SINGLE-LINE value: a PEM therefore
 * arrives with its line breaks written as the two characters `\n`. Node's key parser needs real
 * line breaks, so the escapes are turned back here. A value that already carries real newlines is
 * returned untouched, so both forms work. Without this the documented "single-line PEM with escaped
 * newlines" was exactly the form that failed.
 */
export function normalizeSigningKey(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

/**
 * UR-20261012-036 — the key the VERIFIER needs.
 *
 * A verifier only ever checks signatures, so it needs only the PUBLIC half. Historically the runtime
 * was handed the private key and derived the public one from it, which forced the platform's signing
 * secret to sit inside the bot for no reason. `BUILD_SIGNING_PUBLIC_KEY` is now preferred; the private
 * key remains accepted so the builder (and any existing deployment) still works.
 *
 * Returns undefined when neither is configured — the caller then leaves the provenance guard disarmed.
 */
export function resolveSigningPublicKey(
  privateKey: string,
  publicKey: string,
): KeyObject | undefined {
  if (publicKey.trim() !== '') return createPublicKey(normalizeSigningKey(publicKey));
  if (privateKey.trim() !== '') return createPublicKey(normalizeSigningKey(privateKey));
  return undefined;
}

/** The slice of the verifier the arming helper drives. */
export interface KeyRegistrar {
  registerKey(keyId: string, publicKey: string | KeyObject): unknown;
}

export interface ProvenanceArmResult {
  readonly armed: boolean;
  /** Present when the key could not be used; the caller logs it. Never thrown. */
  readonly error?: string;
}

/**
 * UR-20261012-040 — arms the build-provenance guard, and CANNOT throw.
 *
 * This is a boot-time path: an unusable key must degrade to "guard off, one warning", exactly as it
 * did before UR-20261012-036. That record moved the key resolution outside the surrounding
 * try/catch, so a malformed PEM threw during boot and the process died with ERR_OSSL_UNSUPPORTED —
 * a live outage. Keeping resolution AND registration inside this one helper is what makes the
 * failure non-fatal again, and the test that a bad key does not throw is the guard against repeating it.
 */
export interface RegistrySigningKey {
  readonly keyId: string;
  readonly publicKey: string;
}

/**
 * UR-20261012-042 (A2.2) — registers the `signing_keys` registry's active keys on a verifier.
 *
 * A row that cannot be parsed is skipped rather than allowed to fail the others: a bad row is one
 * revoked-or-rotated key's problem, not a reason to disarm every other key. Never throws, for the
 * same boot-path reason as `armBuildProvenance`. Returns how many keys were registered.
 */
export function armRegistryKeys(
  verifier: KeyRegistrar,
  rows: readonly RegistrySigningKey[],
): number {
  let registered = 0;
  for (const row of rows) {
    if (row.keyId === '' || row.publicKey.trim() === '') continue;
    try {
      verifier.registerKey(row.keyId, row.publicKey);
      registered += 1;
    } catch {
      // A malformed row is skipped; the remaining keys still register.
    }
  }
  return registered;
}

export function armBuildProvenance(
  verifier: KeyRegistrar,
  keyId: string,
  privateKey: string,
  publicKey: string,
  registryKeys: readonly RegistrySigningKey[] = [],
): ProvenanceArmResult {
  // UR-20261012-042 — the registry is armed FIRST so the configured key can override a same-id row.
  // A registry-only deployment (no config key) is now armed, which it was not before.
  let armed = armRegistryKeys(verifier, registryKeys) > 0;
  if (keyId === '') return { armed };
  try {
    const key = resolveSigningPublicKey(privateKey, publicKey);
    if (key === undefined) return { armed };
    verifier.registerKey(keyId, key);
    armed = true;
    return { armed };
  } catch (err) {
    return { armed, error: err instanceof Error ? err.message : String(err) };
  }
}

export const BUILD_SIGNING_ALGORITHM = 'Ed25519';
export const HASH_ALGORITHM = 'sha256';
export const HASH_PREFIX = 'sha256:';
export const BUILD_PROVENANCE_SIDECAR = 'build-provenance.json';

/** The provenance tuple the signature is bound to (§15.8). */
export interface BuildProvenanceTuple {
  readonly moduleSlug: string;
  readonly version: string;
  readonly devId: string;
  readonly buildId: string;
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
  readonly buildId: string;
  readonly moduleSlug: string;
  readonly version: string;
  readonly devId: string;
  readonly sourceArchiveHash: string;
  readonly artifactHash: string;
  readonly lockfileHash: string;
  readonly gateResultsHash: string;
  /**
   * UR-20261018-093 — a BAKED module (placed directly into the image by
   * `apps/main/scripts/place-first-party-modules.mjs`, never promoted through Swastik) has no
   * `builds` row. Its sidecar, written at image-build time and carried in the image layer, IS its
   * build record: the loader verifies the on-disk artifact hash against `artifactHash` here. Absent
   * for promoted modules, whose record lives in the `builds` table.
   */
  readonly baked?: boolean;
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
  for (const field of DESCRIPTOR_FIELD_ORDER) ordered[field] = tuple[field];
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
