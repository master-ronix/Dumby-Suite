import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-ARCH-0007-1 — no src/modules/ directory exists; the image ships only the application core.
describe('ACC-ARCH-0007-1 — no in-tree modules', () => {
  it('src/modules does not exist', () => {
    expect(isDir('apps/main/src/modules')).toBe(false);
  });
});
