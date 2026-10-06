import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-GOV-0006-1 — module framework mandates: manifest contract, four tiers, five sanctioned cross-module patterns.
describe('ACC-GOV-0006-1 — module mandates', () => {
  it('the manifest contract and the five-pattern document exist', () => {
    expect(existsRepo('docs/contracts/module-manifest.schema.json')).toBe(true);
    expect(existsRepo('docs/spec/modules/inter-module-communication-and-contracts.md')).toBe(true);
  });
});
