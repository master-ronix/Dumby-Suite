import type { Knex } from 'knex';

/**
 * §24.2.1 — the monthly partition lifecycle for `audit_logs`. A background job creates the next
 * month's partition before the current month ends, and drops partitions older than the retention
 * window (default 90 days). Retention is **partition-drop only** — no partition is truncated in
 * place.
 */
export const AUDIT_RETENTION_DAYS = 90;

function monthBounds(date: Date): { start: string; end: string; name: string } {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 1));
  const name = `audit_logs_${start.toISOString().slice(0, 7).replace('-', '_')}`;
  return { start: start.toISOString(), end: end.toISOString(), name };
}

/** Creates the partition covering `date` (idempotent). */
export async function ensurePartitionFor(knex: Knex, date: Date): Promise<string> {
  const { start, end, name } = monthBounds(date);
  // Partition bounds are DDL literals — Postgres rejects bind parameters here — so the internally
  // generated ISO dates are inlined (never user input).
  await knex.raw(
    `create table if not exists ?? partition of audit_logs for values from ('${start}') to ('${end}')`,
    [name],
  );
  return name;
}

/** Creates this month's and next month's partitions. */
export async function ensureMonthlyPartitions(
  knex: Knex,
  now: Date = new Date(),
): Promise<string[]> {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return [await ensurePartitionFor(knex, now), await ensurePartitionFor(knex, next)];
}

/** Drops partitions whose range ends before the retention cutoff (partition-drop only). */
export async function dropExpiredPartitions(
  knex: Knex,
  retentionDays: number = AUDIT_RETENTION_DAYS,
  now: Date = new Date(),
): Promise<string[]> {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  const rows = await knex.raw<{ rows: { child: string }[] }>(
    `select c.relname as child
       from pg_inherits
       join pg_class c on c.oid = pg_inherits.inhrelid
       join pg_class p on p.oid = pg_inherits.inhparent
      where p.relname = 'audit_logs'`,
  );
  const dropped: string[] = [];
  for (const { child } of rows.rows) {
    const match = /^audit_logs_(\d{4})_(\d{2})$/.exec(child);
    if (match === null) continue;
    const partitionEnd = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1));
    if (partitionEnd <= cutoff) {
      await knex.raw('drop table if exists ??', [child]);
      dropped.push(child);
    }
  }
  return dropped;
}
