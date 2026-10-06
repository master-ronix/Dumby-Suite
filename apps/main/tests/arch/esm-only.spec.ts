import { describe, expect, it } from 'vitest';
import { readRepo, srcFiles } from '../spec-utils.js';
// ACC-ARCH-0005-2 — module format is ESM-only: a CommonJS require build fails CI.
describe('ACC-ARCH-0005-2 — ESM only', () => {
  it('the package is type:module and the tree uses ESM', () => {
    const pkg = JSON.parse(readRepo('apps/main/package.json')) as { type?: string };
    expect(pkg.type).toBe('module');
    expect(
      srcFiles()
        .filter((f) => /module\.exports/.test(f.source))
        .map((f) => f.path),
    ).toEqual([]);
  });
});
