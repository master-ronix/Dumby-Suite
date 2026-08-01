import type { Knex } from 'knex';

/** createdAt/updatedAt with DB-side defaults — every entity table gets these. */
export function addTimestamps(knex: Knex, table: Knex.CreateTableBuilder): void {
  table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
}

/** deletedAt/deletedBy — present on every soft-deletable table (spec section 15). */
export function addSoftDelete(table: Knex.CreateTableBuilder): void {
  table.timestamp('deletedAt', { useTz: true }).nullable();
  table.string('deletedBy').nullable();
}

/**
 * A soft-deletable table's "uniqueness" must only apply to live rows, or a
 * legitimate re-create after a soft delete would collide with the deleted
 * row. Implemented as a partial unique index (`where "deletedAt" is null`)
 * rather than a plain unique constraint.
 */
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
