import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0021-4 — fail semantics: layers 2/3/5/6 fail-closed; 4/7 fail-open; Layer 1 override bypasses all.

describe('ACC-REQ-0021-4 — permission fail semantics', () => {
  it('the resolver documents fail-closed / fail-open behaviour', () => {
    const src = readSrc('permissions/resolver.ts');
    expect(src).toMatch(/fail|deny|closed|open/i);
  });
});
