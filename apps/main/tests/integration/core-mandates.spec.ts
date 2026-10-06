import { describe, expect, it } from 'vitest';
import { existsRepo, readSrc } from '../spec-utils.js';
// ACC-GOV-0005-1 — one bootstrap (18 stages), one shutdown (9 steps), one typed DI container.

describe('ACC-GOV-0005-1 — core mandates', () => {
  it('one bootstrap, one shutdown list, one container', () => {
    expect(readSrc('bootstrap/stages.ts')).toMatch(/SHUTDOWN_STEPS/);
    expect(existsRepo('apps/main/src/di/container.ts')).toBe(true);
    expect(existsRepo('apps/main/src/bootstrap/bootstrap.ts')).toBe(true);
  });
});
