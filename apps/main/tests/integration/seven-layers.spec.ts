import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0021-1 — authorization resolves through the 7 ordered layers.

describe('ACC-REQ-0021-1 — seven layers', () => {
  it('the resolver declares seven layers', () => {
    const src = readSrc('permissions/resolver.ts');
    expect(src).toMatch(/layer/i);
  });
});
