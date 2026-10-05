import { describe, expect, it } from 'vitest';
import { readRepo, listDir, isDir } from '../spec-utils.js';
// ACC-FOUND-0002-1 — cross-module access requires a declared DI token or event subscription; direct imports fail.
describe('ACC-FOUND-0002-1 — module isolation', () => {
  it('no module package imports another module package', () => {
    const mods = listDir('packages/modules');
    const offenders: string[] = [];
    for (const m of mods) {
      const srcDir = `packages/modules/${m}/src`;
      if (!isDir(srcDir)) continue;
      for (const f of listDir(srcDir)) {
        if (!f.endsWith('.ts')) continue;
        const body = readRepo(`${srcDir}/${f}`);
        for (const other of mods) {
          if (other !== m && new RegExp(`@workspace/${other}\b`).test(body))
            offenders.push(`${m}->${other}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
