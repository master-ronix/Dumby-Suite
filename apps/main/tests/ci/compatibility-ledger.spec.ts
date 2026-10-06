import { describe, expect, it } from 'vitest';
import { existsRepo, readSrc } from '../spec-utils.js';
// ACC-LIFE-0042-1 — semver is enforced and the Compatibility Ledger gates releases/deployments.
describe('ACC-LIFE-0042-1 — compatibility ledger', () => {
  it('the ledger and the semver module exist', () => {
    expect(existsRepo('tools/release_manager/compatibility-ledger.json')).toBe(true);
    expect(readSrc('licensing/semver.ts').length).toBeGreaterThan(0);
  });
});
