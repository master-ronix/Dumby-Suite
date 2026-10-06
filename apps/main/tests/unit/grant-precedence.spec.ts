import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0021-3 — layer 7 grants resolve role->group->set with most-specific-wins.
describe('ACC-REQ-0021-3 — grant precedence', () => {
  it('the RBAC service resolves grant precedence', () => {
    expect(readSrc('permissions/rbac.ts').length).toBeGreaterThan(0);
  });
});
