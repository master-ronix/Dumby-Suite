import { describe, expect, it } from 'vitest';
import { existsRepo, readRepo } from '../spec-utils.js';
// ACC-LIFE-0040-1 — CI runs the documented stages with SHA-pinned actions; Dependabot is enabled.
describe('ACC-LIFE-0040-1 — CI pipeline', () => {
  it('the root workflow and dependabot config exist; actions are SHA-pinned', () => {
    const ci = readRepo('.github/workflows/ci.yml');
    expect(ci).toMatch(/typecheck|lint/);
    expect(ci).toMatch(/uses:\s*[^\s]+@[0-9a-f]{40}/);
    expect(existsRepo('.github/dependabot.yml')).toBe(true);
  });
});
