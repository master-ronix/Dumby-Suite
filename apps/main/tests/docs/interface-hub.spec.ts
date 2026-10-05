import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-REF-0007-1 — the Interface Hub appendix matches the shipped dashboard surfaces.
describe('ACC-REF-0007-1 — Interface Hub appendix', () => {
  it('the hub appendix exists', () => {
    expect(existsRepo('docs/spec/reference/appendix-b-extended-reference-interface-hub.md')).toBe(
      true,
    );
  });
});
