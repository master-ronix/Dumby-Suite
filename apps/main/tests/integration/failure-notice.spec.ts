import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-OPS-0028-3 — every user-visible failure renders the formal notice frame.

describe('ACC-OPS-0028-3 — failure notice', () => {
  it('the renderer maps errors to notice reason codes', () => {
    expect(readSrc('rendering/core-renderer.ts')).toMatch(/noticeReasonFromError/);
  });
});
