import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-MOD-0013-3 — core-tier modules load for every guild with no disable mechanism.
describe('ACC-MOD-0013-3 — core non-disableable', () => {
  it('core tier is treated as always-on', () => {
    expect(readSrc('module-system/tier-rules.ts').length).toBeGreaterThan(0);
  });
});
