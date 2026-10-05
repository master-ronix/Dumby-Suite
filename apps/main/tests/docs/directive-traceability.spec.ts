import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-GOV-0011-1 — every directive rule traces to a blueprint/spec section.
describe('ACC-GOV-0011-1 — directive traceability', () => {
  it('the traceability appendix maps D- rules to sections', () => {
    const body = readRepo('docs/spec/governance/appendix-a-directive-to-blueprint-traceability.md');
    expect(body).toMatch(/Part\s+\d/);
    expect(body).toMatch(/§/);
  });
});
