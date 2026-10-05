import type { Knex } from 'knex';

export function addTimestamps(knex: Knex, table: Knex.CreateTableBuilder): void {
  table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

export function addSoftDelete(table: Knex.CreateTableBuilder): void {
  table.timestamp('deletedAt', { useTz: true }).nullable();
  table.string('deletedBy').nullable();
}

/** §24.5 — the standard audit columns: snowflake or service-identity string, nullable. */
export function addAuditColumns(table: Knex.CreateTableBuilder): void {
  table.string('createdBy').nullable();
  table.string('updatedBy').nullable();
}

export async function createPartialUniqueNotDeleted(
  knex: Knex,
  tableName: string,
  columns: readonly string[],
  indexName?: string,
): Promise<void> {
  const name = indexName ?? `${tableName}_${columns.join('_')}_not_deleted_uq`;
  const columnList = columns.map(() => '??').join(', ');
  await knex.raw(
    `create unique index if not exists ?? on ?? (${columnList}) where "deletedAt" is null`,
    [name, tableName, ...columns],
  );
}
