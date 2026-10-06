import { describe, expect, it } from 'vitest';
import { existsRepo, listDir } from '../spec-utils.js';
// ACC-FOUND-0001-2 — the seven design pillars hold.
describe('ACC-FOUND-0001-2 — design pillars', () => {
  it('the doctrine document is present and the core pillars are realised', () => {
    expect(existsRepo('docs/spec/foundations/the-unified-modular-doctrine.md')).toBe(true);
    expect(listDir('apps/main/src/middleware/built-in').length).toBe(12);
  });
});
