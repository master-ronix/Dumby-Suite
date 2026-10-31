import { describe, expect, it } from 'vitest';
import { readRepo, readSrc } from '../spec-utils.js';
// ACC-REQ-0004-1 — every surface is issued by the Renderer using the Components v2 grammar.

describe('ACC-REQ-0004-1 — renderer grammar', () => {
  it('the renderer builds Components v2 containers', () => {
    const src = readSrc('rendering/core-renderer.ts');
    expect(src).toMatch(/container\(/);
    expect(src).toMatch(/textDisplay/);
    // the primitive vocabulary lives in the SDK now, so the grammar check reads it there
    expect(readRepo('packages/swastik/src/components-v2.ts')).toMatch(/separator/);
  });
});
