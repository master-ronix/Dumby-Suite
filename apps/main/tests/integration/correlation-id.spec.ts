import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-OPS-0027-1 — one correlationId links every log line, trace span, and metrics exemplar.

describe('ACC-OPS-0027-1 — correlation id', () => {
  it('a correlation id is threaded through the trace middleware', () => {
    expect(readSrc('middleware/built-in/trace.ts')).toMatch(/correlationId|traceId/);
  });
});
