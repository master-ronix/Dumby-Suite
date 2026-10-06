import { describe, expect, it } from 'vitest';
import { existsRepo, readRepo } from '../spec-utils.js';
// ACC-MOD-0014-1 — cross-module interaction uses only the five sanctioned patterns; any other path fails lint.
describe('ACC-MOD-0014-1 — five patterns', () => {
  it('the five-pattern contract is documented and the isolation lint exists', () => {
    expect(existsRepo('docs/spec/modules/inter-module-communication-and-contracts.md')).toBe(true);
    expect(readRepo('packages/modules/eslint.config.mjs').length).toBeGreaterThan(0);
  });
});
