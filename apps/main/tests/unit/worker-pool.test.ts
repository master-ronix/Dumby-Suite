import { test, expect } from 'vitest';
import { WorkerThreadPool } from '../../src/shared/utils/worker-pool.js';

test('rejects a pool size below 1', () => {
  expect(() => new WorkerThreadPool(0)).toThrow(RangeError);
});

test('runs a task in a worker and preserves the correlationId', async () => {
  const pool = new WorkerThreadPool(1);
  const out = await pool.run<{ a: number; b: number }, { sum: number; cid: string }>(
    (input, correlationId) => ({ sum: input.a + input.b, cid: correlationId }),
    { a: 2, b: 3 },
    'corr-abc',
  );
  expect(out.sum).toBe(5);
  expect(out.cid).toBe('corr-abc');
});

test('rejects when the worker task throws', async () => {
  const pool = new WorkerThreadPool(1);
  await expect(
    pool.run<null, void>(
      () => {
        throw new Error('worker-boom');
      },
      null,
      'corr-fail',
    ),
  ).rejects.toThrow(/worker-boom/);
});
