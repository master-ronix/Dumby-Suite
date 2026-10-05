import { describe, expect, it } from 'vitest';
import { listDir } from '../spec-utils.js';
// ACC-LIFE-0039-1 — the documented dev workflow (branch/commit hooks) is wired and enforced.
describe('ACC-LIFE-0039-1 — dev hooks', () => {
  it('husky hooks are wired', () => {
    const hooks = listDir('apps/main/.husky');
    expect(hooks).toContain('pre-commit');
    expect(hooks).toContain('commit-msg');
  });
});
