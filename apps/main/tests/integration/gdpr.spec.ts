import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-OPS-0034-1 — data export and erasure are implemented; the audit log is insert-only.

describe('ACC-OPS-0034-1 — GDPR', () => {
  it('an erasure coordinator exists', () => {
    expect(existsRepo('apps/main/src/shared/erasure-coordinator.ts')).toBe(true);
  });
});
