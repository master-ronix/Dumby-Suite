import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Real keyed HMAC-SHA256 (CL-0087). Uses createHmac — not a length-extension
 * vulnerable concatenation of the plain data with the key. Keys and data may
 * be raw bytes (Buffer) or text; string inputs are UTF-8 encoded by
 * `createHmac` exactly as Node's canonical HMAC primitive encodes them.
 */
export function hmacSha256(key: Buffer | string, data: Buffer | string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Constant-time equality between two strings (CL-0071/CL-0098).
 * Each input is reduced through sha256 first so both operands always have the
 * same byte length, then compared with Node's constant-time
 * `crypto.timingSafeEqual`. Length differences therefore cannot short-circuit
 * the comparison and leak via timing.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

/** Constant-time comparison of two pre-hashed buffers (already same length). */
export function bufferConstantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
