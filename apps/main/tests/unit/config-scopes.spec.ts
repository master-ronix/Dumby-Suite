import { describe, expect, it } from 'vitest';
import { existsRepo, readRepo } from '../spec-utils.js';
// ACC-DATA-0023-1 — three config scopes exist: core (process), guild, and process-module.
describe('ACC-DATA-0023-1 — config scopes', () => {
  it('core, guild and module scopes are represented', () => {
    expect(existsRepo('apps/main/src/config/env.schema.ts')).toBe(true);
    expect(existsRepo('apps/main/src/config/guild-config.schema.ts')).toBe(true);
    expect(readRepo('packages/swastik/src/manifest-schema.ts')).toMatch(/config/);
  });
});
