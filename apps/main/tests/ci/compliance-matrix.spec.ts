import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-REF-0045-1 — the compliance matrix regenerates from the Compatibility Ledger with no drift.
describe('ACC-REF-0045-1 — compliance matrix', () => {
  it('the mandatory-feature compliance matrix exists', () => {
    expect(existsRepo('docs/spec/reference/mandatory-feature-compliance-matrix.md')).toBe(true);
  });
});
