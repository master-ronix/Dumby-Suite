import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-DATA-0025-3 — multi-pod production requires a Redis HA topology (Cluster/Sentinel) with documented failover.
describe('ACC-DATA-0025-3 — Redis HA', () => {
  it('the HA requirement is documented', () => {
    const body = readRepo('docs/spec/data/caching-architecture.md');
    expect(body).toMatch(/Cluster|Sentinel|HA|failover/i);
  });
});
