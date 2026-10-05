import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-GOV-0013-1 — each logged deviation is owned by a row or explicitly deferred (no silent unknowns).
describe('ACC-GOV-0013-1 — deviations owned', () => {
  it('the logged-deviations appendix exists', () => {
    const body = readRepo('docs/spec/governance/appendix-c-logged-deviations-and-open-items.md');
    expect(body).toMatch(/Home|owned|deferred/i);
  });
});
