import { describe, expect, it } from 'vitest';
import { existsRepo, listDir } from '../spec-utils.js';
// ACC-GOV-0007-1 — request/permission/data mandates: 12-stage pipeline, seven-layer resolver, repository pattern.
describe('ACC-GOV-0007-1 — request mandates', () => {
  it('the twelve middleware stages and the resolver are present', () => {
    expect(listDir('apps/main/src/middleware/built-in').length).toBe(12);
    expect(existsRepo('apps/main/src/permissions/resolver.ts')).toBe(true);
    expect(existsRepo('apps/main/src/db/repositories')).toBe(true);
  });
});
