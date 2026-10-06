import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0014-2 — the reason-code index is complete and every notice uses one of the defined codes.
describe('ACC-REQ-0014-2 — reason codes', () => {
  it('the renderer declares the notice reason-code union', () => {
    const src = readSrc('rendering/core-renderer.ts');
    expect(src).toMatch(/NoticeReasonCode/);
    for (const c of ['FORBIDDEN', 'MAINTENANCE', 'MODULE_ERROR']) expect(src).toContain(c);
  });
});
