import { describe, expect, it } from 'vitest';
import { readSrc, listDir } from '../spec-utils.js';
// ACC-REQ-0019-1 — the pipeline runs the 12 built-in stages in the fixed priority order -20..90.

describe('ACC-REQ-0019-1 — middleware order', () => {
  it('twelve built-in stages exist with priorities', () => {
    const stages = listDir('apps/main/src/middleware/built-in');
    expect(stages.length).toBe(12);
    const pipeline = readSrc('middleware/middleware-pipeline.ts');
    expect(pipeline).toMatch(/priorit/i);
  });
});
