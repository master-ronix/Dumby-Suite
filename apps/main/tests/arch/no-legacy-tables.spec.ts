import { describe, expect, it } from 'vitest';
import { readRepo, listDir } from '../spec-utils.js';
// ACC-DATA-0024-4 — legacy swastik_developers/swastik_builds tables are absent from the live schema.
describe('ACC-DATA-0024-4 — no legacy tables', () => {
  it('a later migration drops the legacy tables', () => {
    const files = listDir('apps/main/src/db/migrations').filter((f) => f.endsWith('.ts'));
    const all = files.map((f) => readRepo(`apps/main/src/db/migrations/${f}`)).join('\n');
    expect(all).toMatch(/dropTableIfExists\('swastik_developers'\)/);
    expect(all).toMatch(/dropTableIfExists\('swastik_builds'\)/);
  });
});
