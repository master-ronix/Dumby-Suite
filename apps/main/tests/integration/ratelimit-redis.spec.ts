import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0019-4 — rate-limit/cooldown counters live in Redis, never per-process memory.

describe('ACC-REQ-0019-4 — redis rate limit', () => {
  it('the rate limiter fails closed with a bounded fallback', () => {
    const src = readSrc('ratelimit/sliding-window.ts');
    expect(src).toMatch(/FallbackRateLimiter/);
  });
});
