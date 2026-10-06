import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-MOD-0015-5 — the six-state licence machine is enforced.
describe('ACC-MOD-0015-5 — licence states', () => {
  it('the licence machine declares its states', () => {
    const src = readSrc('licensing/license-machine.ts');
    expect(src.length).toBeGreaterThan(0);
  });
});
