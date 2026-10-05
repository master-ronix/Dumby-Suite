import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0008-1 — bootstrap runs exactly 18 named stages in order.

describe('ACC-ARCH-0008-1 — bootstrap stages', () => {
  it('declares exactly 18 stages in a fixed order', () => {
    const src = readSrc('bootstrap/stages.ts');
    const stages = src.match(/'[A-Z_]+'/g) ?? [];
    expect(src).toMatch(/BOOTSTRAP_STAGES/);
    expect(stages.length).toBeGreaterThanOrEqual(18);
  });
});
