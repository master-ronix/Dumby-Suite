import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function hmacSha256(key: Buffer | string, data: Buffer | string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

export function constantTimeEqual(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a).digest();
  const bHash = createHash('sha256').update(b).digest();
  return timingSafeEqual(aHash, bHash);
}

export function bufferConstantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
