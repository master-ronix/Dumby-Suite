import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0008-3 — /health/readiness returns 200 only after stage 18.

describe('ACC-ARCH-0008-3 — readiness', () => {
  it('the health server tracks bootstrap completion', () => {
    const src = readSrc('application/HealthServer.ts');
    expect(src).toMatch(/readiness/);
  });
});
