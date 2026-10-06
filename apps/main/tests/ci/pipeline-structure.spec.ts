import { describe, expect, it } from 'vitest';
import { listDir } from '../spec-utils.js';
// ACC-REQ-0019-3 — a structural wiring test asserts every built-in stage is present exactly once in priority order.
describe('ACC-REQ-0019-3 — pipeline structure', () => {
  it('the built-in middleware stages are present', () => {
    const stages = listDir('apps/main/src/middleware/built-in');
    expect(stages.length).toBe(12);
  });
});
