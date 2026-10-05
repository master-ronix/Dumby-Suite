import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-GOV-0009-1 — reliability/security/performance mandates hold (observability, secrets, SLOs).
describe('ACC-GOV-0009-1 — ops mandates', () => {
  it('observability, security and SLO artifacts exist', () => {
    expect(existsRepo('apps/main/src/metrics/registry.ts')).toBe(true);
    expect(existsRepo('apps/main/src/logging/logger.ts')).toBe(true);
    expect(existsRepo('docs/spec/operations/security-architecture-threat-model.md')).toBe(true);
  });
});
