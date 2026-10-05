import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0005-1 — every interaction is answered instantly with a buffer embed, edited once into the final render or a formal notice frame.

describe('ACC-REQ-0005-1 — buffer then render', () => {
  it('the renderer exposes sendBuffer then editFinal/editNotice', () => {
    const src = readSrc('rendering/core-renderer.ts');
    expect(src).toMatch(/sendBuffer/);
    expect(src).toMatch(/editFinal/);
    expect(src).toMatch(/editNotice/);
  });
});
