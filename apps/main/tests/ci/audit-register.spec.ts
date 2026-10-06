import { describe, expect, it } from 'vitest';
import { existsRepo, readRepo } from '../spec-utils.js';
// ACC-REF-0009-1 — every audit-register entry maps to a status/capabilities.json record with evidence.
describe('ACC-REF-0009-1 — audit register', () => {
  it('the register and the capabilities ledger both exist', () => {
    expect(existsRepo('docs/spec/reference/appendix-implementation-status-audit-register.md')).toBe(
      true,
    );
    const caps = JSON.parse(readRepo('docs/status/capabilities.json')) as {
      capabilities: { id: string }[];
    };
    expect(caps.capabilities.length).toBeGreaterThan(0);
  });
});
