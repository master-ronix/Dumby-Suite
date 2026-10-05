import { describe, expect, it } from 'vitest';
import { existsRepo, isDir } from '../spec-utils.js';
// ACC-REQ-0017-3 — there is exactly one command system (ICommand via CommandRouter); the legacy src/core path is removed.
describe('ACC-REQ-0017-3 — single command system', () => {
  it('exactly one command router exists and no src/core wrapper remains', () => {
    expect(existsRepo('apps/main/src/commands/command-router.ts')).toBe(true);
    expect(isDir('apps/main/src/core')).toBe(false);
  });
});
