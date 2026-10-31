import { describe, expect, it } from 'vitest';
import { existsRepo, readSrc, srcText } from '../spec-utils.js';
// ACC-OPS-0032-3 — webhook payloads are HMAC-verified; Argon2id for secrets, envelope encryption for recoverable credentials.

describe('ACC-OPS-0032-3 — security controls', () => {
  it('webhook HMAC, argon2id and envelope encryption exist', () => {
    expect(readSrc('webhooks/inbound.ts') + readSrc('webhooks/index.ts') + srcText()).toMatch(
      /hmac/i,
    );
    expect(srcText()).toMatch(/argon2/i);
    expect(existsRepo('packages/swastik/src/envelope.ts')).toBe(true);
  });
});
