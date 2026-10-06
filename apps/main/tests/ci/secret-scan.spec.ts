import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-OPS-0032-1 — secrets arrive via injected env vars; CI secret-scanning fails on committed credentials.
describe('ACC-OPS-0032-1 — secret handling', () => {
  it('the env template exists and no committed .env is present', () => {
    expect(existsRepo('apps/main/.env.example')).toBe(true);
    expect(existsRepo('apps/main/.env')).toBe(false);
  });
});
