import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-MOD-0014-3 — Pattern 3 reads are single-row by PK/unique FK only.
describe('ACC-MOD-0014-3 — cross-module read', () => {
  it('the crossModuleRead accessor naming convention is enforced', () => {
    const sw = readRepo('packages/swastik/src/manifest-schema.ts');
    expect(sw).toMatch(/ForCrossModuleRead/);
  });
});
