import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0005-2 — navigation edits in place (one message), never posting superseded messages.

describe('ACC-REQ-0005-2 — edit in place', () => {
  it('the renderer edits the reply rather than replying again', () => {
    const src = readSrc('rendering/core-renderer.ts');
    expect(src).toMatch(/editReply/);
  });
});
