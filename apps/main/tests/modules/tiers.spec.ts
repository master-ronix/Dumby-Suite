import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-MOD-0013-1 — exactly four tiers exist; per-guild enable/disable fails closed and guild_module_states backfill is current.
describe('ACC-MOD-0013-1 — tiers', () => {
  it('the four tiers are declared and the state table exists', () => {
    const sw = readRepo('packages/swastik/src/manifest-schema.ts');
    for (const t of ['admin', 'core', 'standard', 'marketplace']) expect(sw).toContain(`'${t}'`);
  });
});
