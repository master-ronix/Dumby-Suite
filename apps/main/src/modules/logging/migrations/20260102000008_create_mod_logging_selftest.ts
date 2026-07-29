import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../../../db/migration-helpers.js';

/** Module-owned table for Logging (illustrative skeleton). Audit columns + soft-delete per spec section 15. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mod_logging_selftest', (table) => {
    table.uuid('id').primary();
    table.enu('status', ['pass', 'fail'], { useNative: true, enumName: 'mod_logging_selftest_status' }).notNullable();
    table.jsonb('details').notNullable().defaultTo('{}');
    table.timestamp('ranAt', { useTz: true }).notNullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mod_logging_selftest');
  await knex.raw('drop type if exists mod_logging_selftest_status');
}
