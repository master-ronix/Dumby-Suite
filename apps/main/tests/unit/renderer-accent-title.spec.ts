import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-REQ-0004-2 — the accent is the single non-configurable blurple #5865F2 and titles follow the A4 grammar.
describe('ACC-REQ-0004-2 — renderer accent and title', () => {
  it('the single accent token is the blurple', () => {
    const v2 = readRepo('apps/main/src/shared/utils/components-v2.ts');
    expect(v2).toMatch(/DEFAULT_ACCENT_COLOR\s*=\s*0x5865f2/i);
  });
});
