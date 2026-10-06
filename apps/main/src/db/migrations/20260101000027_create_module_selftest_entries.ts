import type { Knex } from 'knex';

/**
 * Shared aggregation table for module self-test runs (spec: "supporting
 * table ... per module or equivalent" — implemented as one shared table
 * keyed by moduleSlug rather than 22 near-identical tables). Each of the
 * 22 module skeletons ALSO owns its own dedicated table per the
 * per-module migration requirement; see src/modules/<name>/migrations.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('module_selftest_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('moduleSlug').notNullable();
    table
      .enu('status', ['pass', 'fail'], { useNative: true, enumName: 'module_selftest_status' })
      .notNullable();
    table.jsonb('details').notNullable().defaultTo('{}');
    table.timestamp('ranAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['moduleSlug']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('module_selftest_entries');
  await knex.raw('drop type if exists module_selftest_status');
}
