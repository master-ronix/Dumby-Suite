import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-MOD-0013-2 — admin-tier commands are never registered outside the dev guild and pass the 5-layer gate.
describe('ACC-MOD-0013-2 — admin gate', () => {
  it('the admin-tier gate exists', () => {
    expect(existsRepo('apps/main/src/permissions/admin-tier-gate.ts')).toBe(true);
    expect(existsRepo('apps/main/src/permissions/admin-eval-gate.ts')).toBe(true);
  });
});
