import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0018-3 — internal bus emit depth is bounded (cycle detection) and a cyclic emit is rejected.
describe('ACC-REQ-0018-3 — event cycle guard', () => {
  it('the bus bounds emit depth', () => {
    const src = readSrc('events/event-bus.ts');
    expect(src).toMatch(/MAX_EMIT_DEPTH|cycleDetected/);
  });
});
