import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-GOV-0012-1 — the compliance self-audit checklist items are individually checkable.
describe('ACC-GOV-0012-1 — compliance checklist', () => {
  it('the checklist carries individually checkable items', () => {
    const body = readRepo('docs/spec/governance/appendix-b-compliance-self-audit-checklist.md');
    expect(body).toMatch(/\[ \]/);
  });
});
