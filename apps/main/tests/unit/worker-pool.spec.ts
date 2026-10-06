import { describe, expect, it } from 'vitest';
import { WorkerThreadPool } from '../../src/shared/utils/worker-pool.js';
// ACC-MOD-0015-4 — CPU work runs in WorkerThreadPool with the correlationId serialized across the thread boundary.
describe('ACC-MOD-0015-4 — worker pool', () => {
  it('runs a task in a worker and preserves the correlationId across the boundary', async () => {
    const pool = new WorkerThreadPool(1);
    const out = await pool.run<{ a: number; b: number }, { sum: number; correlationId: string }>(
      (input, correlationId) => ({ sum: input.a + input.b, correlationId }),
      { a: 2, b: 3 },
      'corr-abc',
    );
    expect(out.sum).toBe(5);
    expect(out.correlationId).toBe('corr-abc');
  });
});
