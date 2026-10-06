import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-MOD-0012-1 — the scaffold command produces a manifest-valid module skeleton.
describe('ACC-MOD-0012-1 — scaffold', () => {
  it('the _template reference module has the canonical layout', () => {
    const t = 'packages/swastik/_template';
    for (const d of [
      'commands',
      'services',
      'repositories',
      'events',
      'jobs',
      'locales',
      'migrations',
      'config',
      'ui',
      'assets',
      'tests',
    ]) {
      expect(isDir(`${t}/${d}`), `missing ${d}`).toBe(true);
    }
  });
});
