import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * ADR-003 envelope encryption — root key → per-record DEKs → AES-256-GCM.
 *
 * This module implements the narrow, exactly-bounded at-rest scheme for
 * in-process-readable credentials only. It must never be used for values the
 * system only needs to *verify* — those stay under the Argon2id one-way rule
 * (blueprint §32.7, ADR-003 invariant). The boundary is enforced by
 * `envelope-scope.ts`, not by convention.
 *
 * Record layout (all buffers base64-encoded at the boundary):
 *   - ciphertext:   plaintext sealed under a per-record DEK (AES-256-GCM)
 *   - iv, tag:      DEK cipher parameters
 *   - wrappedKey:   the DEK sealed under the root key (AES-256-GCM)
 *   - wrapIv, wrapTag: root-key cipher parameters for the DEK
 *   - kid:          root-key id (rotation re-wraps DEKs and bumps this)
 *
 * Root-key rotation re-wraps DEKs WITHOUT decrypting any record ciphertext,
 * so records are never exposed in clear at rotation time.
 */

export const ENVELOPE_ALGORITHM = 'AES-256-GCM';
export const ROOT_KEY_BYTE_LENGTH = 32;
export const DEK_BYTE_LENGTH = 32;
export const IV_BYTE_LENGTH = 12;

export interface SealedEnvelope {
  ciphertext: string;
  iv: string;
  tag: string;
  wrappedKey: string;
  wrapIv: string;
  wrapTag: string;
  kid: string;
  algorithm: typeof ENVELOPE_ALGORITHM;
}

export interface EnvelopeRootKey {
  readonly id: string;
  readonly material: Uint8Array;
}

/**
 * Identity-style operation: verifies a Uint8Array is 32 bytes of usable root
 * key material without leaking timing about its contents.
 */
export class InvalidRootKeyError extends Error {
  override readonly name = 'InvalidRootKeyError';
  constructor(reason: string) {
    super(`invalid root key: ${reason}`);
  }
}

export class EnvelopeUnwrapError extends Error {
  override readonly name = 'EnvelopeUnwrapError';
  constructor(reason: string) {
    super(`envelope unwrap failed: ${reason}`);
  }
}

export function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

export function fromBase64(encoded: string): Uint8Array {
  return new Uint8Array(Buffer.from(encoded, 'base64'));
}

function sealAesGcm(
  plaintext: Uint8Array,
  key: Uint8Array,
): {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
} {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: new Uint8Array(ciphertext), iv, tag };
}

function openAesGcm(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  tag: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return new Uint8Array(plain);
  } catch {
    throw new EnvelopeUnwrapError('GCM authentication failed for record');
  }
}

/**
 * Load a root key from its external representation (base64 of 32 bytes).
 * Failure is fail-closed: wrong length or undecodable input is an error,
 * never a silently weakened key.
 */
export function rootKeyFromBase64(id: string, encoded: string): EnvelopeRootKey {
  if (encoded.length === 0) {
    throw new InvalidRootKeyError('empty key material');
  }
  let material: Uint8Array;
  try {
    material = fromBase64(encoded);
  } catch {
    throw new InvalidRootKeyError('not valid base64');
  }
  if (material.byteLength !== ROOT_KEY_BYTE_LENGTH) {
    throw new InvalidRootKeyError(
      `expected ${ROOT_KEY_BYTE_LENGTH} bytes, got ${material.byteLength}`,
    );
  }
  return { id, material };
}

export function randomRootKey(id: string): EnvelopeRootKey {
  return { id, material: new Uint8Array(randomBytes(ROOT_KEY_BYTE_LENGTH)) };
}

/**
 * Seal a plaintext credential into an envelope. The plaintext must be the
 * in-process-readable credential value itself; it is never persisted, and the
 * sealed record never reveals it without the root key.
 */
export function seal(
  plaintext: Uint8Array,
  rootKey: EnvelopeRootKey,
  algorithm: typeof ENVELOPE_ALGORITHM = ENVELOPE_ALGORITHM,
): SealedEnvelope {
  const dek = new Uint8Array(randomBytes(DEK_BYTE_LENGTH));
  const sealed = sealAesGcm(plaintext, dek);
  const wrapped = sealAesGcm(dek, rootKey.material);
  return {
    ciphertext: toBase64(sealed.ciphertext),
    iv: toBase64(sealed.iv),
    tag: toBase64(sealed.tag),
    wrappedKey: toBase64(wrapped.ciphertext),
    wrapIv: toBase64(wrapped.iv),
    wrapTag: toBase64(wrapped.tag),
    kid: rootKey.id,
    algorithm,
  };
}

/**
 * Open an envelope. Fails closed on tampered ciphertext, a wrapped key that
 * does not belong to the supplied root key, or any format mismatch.
 */
export function open(record: SealedEnvelope, rootKey: EnvelopeRootKey): Uint8Array {
  if (record.algorithm !== ENVELOPE_ALGORITHM) {
    throw new EnvelopeUnwrapError(`unsupported algorithm "${record.algorithm}"`);
  }
  const dek = openAesGcm(
    fromBase64(record.wrappedKey),
    fromBase64(record.wrapIv),
    fromBase64(record.wrapTag),
    rootKey.material,
  );
  return openAesGcm(
    fromBase64(record.ciphertext),
    fromBase64(record.iv),
    fromBase64(record.tag),
    dek,
  );
}

/**
 * Rotate the root key for one record: unwrap the DEK under the current root
 * key, re-wrap it under the new one, and re-id the record. The record
 * ciphertext, iv and tag are left untouched — the credential value never
 * enters the clear during rotation.
 */
export function rotate(
  record: SealedEnvelope,
  currentRootKey: EnvelopeRootKey,
  nextRootKey: EnvelopeRootKey,
): SealedEnvelope {
  const dek = openAesGcm(
    fromBase64(record.wrappedKey),
    fromBase64(record.wrapIv),
    fromBase64(record.wrapTag),
    currentRootKey.material,
  );
  const wrapped = sealAesGcm(dek, nextRootKey.material);
  return {
    ...record,
    wrappedKey: toBase64(wrapped.ciphertext),
    wrapIv: toBase64(wrapped.iv),
    wrapTag: toBase64(wrapped.tag),
    kid: nextRootKey.id,
  };
}

/**
 * Constant-time comparison of root-key ids. A rotated record re-opens under
 * the new root key only; timingSafeEqual keeps id checks from leaking match
 * positions.
 */
export function keyIdsEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
