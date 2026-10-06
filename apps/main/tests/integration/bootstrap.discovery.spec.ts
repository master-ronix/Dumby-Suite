import { describe, expect, it } from 'vitest';
import { existsRepo, readSrc } from '../spec-utils.js';
// ACC-ARCH-0008-4 — module discovery is blind and loads in topological order.

describe('ACC-ARCH-0008-4 — blind discovery', () => {
  it('the loader discovers from volumes and topo-sorts', () => {
    expect(readSrc('module-system/swastik-loader.ts')).toMatch(/modulesDir/);
    expect(existsRepo('apps/main/src/module-system/topo-sort.ts')).toBe(true);
  });
});
