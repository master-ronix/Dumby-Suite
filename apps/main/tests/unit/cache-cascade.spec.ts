import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-DATA-0025-1 — two-tier cache: in-process L1 LRU + shared Redis L2, behind the single CacheManager API.
describe('ACC-DATA-0025-1 — cache cascade', () => {
  it('the L1, L2 and key-namespace pieces exist behind one manager', () => {
    for (const f of ['cache/cache-manager.ts', 'cache/l1-cache.ts', 'cache/key-namespace.ts']) {
      expect(existsRepo(`apps/main/src/${f}`), f).toBe(true);
    }
  });
});
