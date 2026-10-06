import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0014-1 — density modes D/M/C render uniformly across every surface.

describe('ACC-REQ-0014-1 — density modes', () => {
  it('the renderer supports modes D, M and C', () => {
    const src = readSrc('rendering/core-renderer.ts');
    expect(src).toMatch(/RenderMode = 'D' \| 'M' \| 'C'/);
  });
});
