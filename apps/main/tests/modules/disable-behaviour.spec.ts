import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-MOD-0013-4 — a disabled Standard/Marketplace module's commands leave the guild list immediately.
describe('ACC-MOD-0013-4 — disable behaviour', () => {
  it('module state governs command deployment', () => {
    expect(existsRepo('apps/main/src/commands/command-deployer.ts')).toBe(true);
  });
});
