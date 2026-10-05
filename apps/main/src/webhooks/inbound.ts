import { constantTimeEqual, hmacSha256 } from '../shared/utils/crypto.js';

/**
 * ACC-OPS-0032-3 — inbound webhook payloads are HMAC-verified before any processing. The
 * signature is compared in constant time so a mismatch cannot be timed.
 */
export function signPayload(secret: string, rawBody: string): string {
  return `sha256=${hmacSha256(secret, rawBody)}`;
}

export function verifyInboundSignature(
  secret: string,
  rawBody: string,
  signature: string,
): boolean {
  if (signature.length === 0) return false;
  return constantTimeEqual(signPayload(secret, rawBody), signature);
}
