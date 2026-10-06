import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-MOD-0014-4 — Pattern 5 datasets declare their schema in the manifest and are validated at Stage 11.
describe('ACC-MOD-0014-4 — global data emit', () => {
  it('the pattern is documented', () => {
    expect(readRepo('docs/spec/modules/inter-module-communication-and-contracts.md')).toMatch(
      /Global Data Emit|global data/i,
    );
  });
});
