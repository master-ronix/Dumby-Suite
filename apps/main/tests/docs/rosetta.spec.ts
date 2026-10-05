import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-ORI-0003-1 — the Rosetta Stone map covers the documented concept clusters.
describe('ACC-ORI-0003-1 — Rosetta Stone', () => {
  it('the conceptual map exists', () => {
    expect(existsRepo('docs/spec/orientation/rosetta-stone-conceptual-map.md')).toBe(true);
  });
});
