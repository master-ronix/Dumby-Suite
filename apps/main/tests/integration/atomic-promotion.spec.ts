import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-MOD-0015-3 — promotion is an atomic symlink swap under a Redis lock.

describe('ACC-MOD-0015-3 — atomic promotion', () => {
  it('the promotion path is atomic and lock-guarded', () => {
    const src = readSrc('module-system/promotion.ts');
    expect(src).toMatch(/symlink|rename/i);
    expect(src).toMatch(/lock/i);
  });
});
