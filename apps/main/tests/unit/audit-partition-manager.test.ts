import { test, expect, vi } from 'vitest';
import {
  ensurePartitionFor,
  ensureMonthlyPartitions,
  dropExpiredPartitions,
  AUDIT_RETENTION_DAYS,
} from '../../src/db/audit-partition-manager.js';

function makeKnex(rawResults: unknown[] = []) {
  const raw = vi.fn();
  for (const result of rawResults) raw.mockResolvedValueOnce(result);
  return { raw };
}

test('ensurePartitionFor builds the monthly partition name', async () => {
  const knex = makeKnex([{}]);
  const name = await ensurePartitionFor(knex as never, new Date(Date.UTC(2026, 0, 15)));
  expect(name).toBe('audit_logs_2026_01');
  expect(knex.raw).toHaveBeenCalledTimes(1);
});

test('ensureMonthlyPartitions creates this month and the next', async () => {
  const knex = makeKnex([{}, {}]);
  const names = await ensureMonthlyPartitions(knex as never, new Date(Date.UTC(2026, 11, 5)));
  expect(names).toStrictEqual(['audit_logs_2026_12', 'audit_logs_2027_01']);
});

test('dropExpiredPartitions drops only partitions older than the retention window', async () => {
  const knex = makeKnex([
    {
      rows: [
        { child: 'audit_logs_2025_01' },
        { child: 'audit_logs_2026_12' },
        { child: 'not_an_audit_partition' },
      ],
    },
    {},
  ]);
  const dropped = await dropExpiredPartitions(knex as never, 90, new Date(Date.UTC(2026, 11, 31)));
  expect(dropped).toStrictEqual(['audit_logs_2025_01']);
});

test('the default retention window is 90 days', () => {
  expect(AUDIT_RETENTION_DAYS).toBe(90);
});
