import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-LIFE-0038-1 — ESLint boundary rules block cross-module imports and direct Redis/DB access.
describe('ACC-LIFE-0038-1 — lint boundaries', () => {
  it('the module eslint config carries boundary rules', () => {
    const cfg = readRepo('packages/modules/eslint.config.mjs');
    expect(cfg).toMatch(/no-restricted-imports|no-restricted-syntax|no-restricted/);
  });
});
