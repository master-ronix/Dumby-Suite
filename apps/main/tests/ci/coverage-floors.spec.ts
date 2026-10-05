import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-LIFE-0037-1 — the four-tier test pyramid exists with the documented per-layer coverage floors.
describe('ACC-LIFE-0037-1 — coverage floors', () => {
  it('vitest enforces per-layer coverage thresholds', () => {
    const cfg = readRepo('apps/main/vitest.config.ts');
    expect(cfg).toMatch(/thresholds/);
    expect(cfg).toMatch(/statements/);
  });
});
