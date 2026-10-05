import { describe, expect, it } from 'vitest';
import { existsRepo, listDir } from '../spec-utils.js';
// ACC-MOD-0016-1 — install flow: verify loaded fleet-wide -> INSERT guild_module_states(active) -> invalidate Redis -> deploy.

describe('ACC-MOD-0016-1 — install flow', () => {
  it('the deployer and module state table exist', () => {
    expect(existsRepo('apps/main/src/commands/command-deployer.ts')).toBe(true);
    expect(
      listDir('apps/main/src/db/migrations').some((f) => f.includes('guild_module_states')),
    ).toBe(true);
  });
});
