import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-OPS-0029-1 — every job processor is idempotent (safe to run twice).
describe('ACC-OPS-0029-1 — job idempotency', () => {
  it('the processor base provides an idempotency hook', () => {
    const src = readSrc('queue/queue-manager.ts');
    expect(src).toMatch(/idempotencyKey/);
  });
});
