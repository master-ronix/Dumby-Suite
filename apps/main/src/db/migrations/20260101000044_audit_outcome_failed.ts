import type { Knex } from 'knex';

/**
 * blueprint.md §22.6 — "Every invocation writes an unconditional `audit_logs` entry after its
 * domain handler completes, recording the true outcome." The enum only carried `allowed` and
 * `rejected`, so a handler that *threw* wrote no row at all: the true outcome was silently lost.
 * `failed` is the third outcome the spec implies.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`alter type audit_outcome add value if not exists 'failed'`);
}

export async function down(): Promise<void> {
  // Postgres cannot remove an enum value; the value is inert if unused.
}
