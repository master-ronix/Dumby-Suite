import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-FOUND-0004-2 — no module ships in-tree under src/; no .github/ exists under apps/main/.
describe('ACC-FOUND-0004-2 — non-goals', () => {
  it('no src/modules and no nested .github under apps/main', () => {
    expect(isDir('apps/main/src/modules')).toBe(false);
    expect(isDir('apps/main/.github')).toBe(false);
  });
});
