import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

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

export function keyIdsEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
