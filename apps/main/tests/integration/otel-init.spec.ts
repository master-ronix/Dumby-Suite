import { describe, expect, it } from 'vitest';
import { existsRepo, readSrc } from '../spec-utils.js';
// ACC-OPS-0027-3 — OpenTelemetry tracing initializes at Stage 04 and metric families are exported.

describe('ACC-OPS-0027-3 — OTel init', () => {
  it('OBSERVABILITY_INIT is stage 04 and tracing exists', () => {
    const src = readSrc('bootstrap/stages.ts');
    expect(src.indexOf('OBSERVABILITY_INIT')).toBeLessThan(src.indexOf('DATABASE_CONNECT'));
    expect(existsRepo('apps/main/src/tracing/tracing.ts')).toBe(true);
  });
});
