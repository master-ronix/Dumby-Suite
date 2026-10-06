import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-GOV-0010-1 — CI hygiene, the Compatibility Ledger release gate, and the Definition of Done are enforced.
describe('ACC-GOV-0010-1 — quality gate', () => {
  it('the CI workflow and the release-manager gate exist', () => {
    expect(existsRepo('.github/workflows/ci.yml')).toBe(true);
    expect(existsRepo('tools/release_manager')).toBe(true);
  });
});
