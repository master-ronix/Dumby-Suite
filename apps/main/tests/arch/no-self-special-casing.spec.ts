import { describe, expect, it } from 'vitest';
import { listDir, isDir } from '../spec-utils.js';
// ACC-FOUND-0001-1 — no framework-only code path exists: every framework behaviour is a module.
describe('ACC-FOUND-0001-1 — no self-special-casing', () => {
  it('first-party behaviour lives as module packages, not in src/', () => {
    expect(isDir('apps/main/src/modules')).toBe(false);
    const mods = listDir('packages/modules');
    for (const m of [
      'dashboard',
      'health',
      'browse',
      'queue',
      'persona',
      'permit',
      'modules',
      'hello-world',
    ]) {
      expect(mods).toContain(m);
    }
  });
});
