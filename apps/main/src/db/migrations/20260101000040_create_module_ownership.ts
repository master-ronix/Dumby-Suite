import type { Knex } from 'knex';

/**
 * §15.8 "Module Ownership — the `modules` Table": `slug` (PK), `ownerDevId`,
 * `createdAt`, `ownershipTransferredAt`. The first accepted upload of a slug inserts the row; a
 * later upload or deploy by a different developer is refused before staging.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('modules', (table) => {
    table.string('slug').primary();
    table
      .string('ownerDevId')
      .notNullable()
      .references('devId')
      .inTable('developers')
      .onDelete('CASCADE');
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('ownershipTransferredAt', { useTz: true }).nullable();
    table.index(['ownerDevId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('modules');
}
