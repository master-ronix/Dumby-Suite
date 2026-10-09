import type { Knex } from 'knex';

/**
 * §15.6 / §15.8 / §22.8 — the single source of identity numbers. One row per identity kind; the
 * value is the last issued number. The Credentials Service and Swastik both draw from this table,
 * so their issuance is coordinated and every id is unique across processes and restarts.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('identity_sequences', (table) => {
    table.string('kind').primary();
    table.bigInteger('value').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('identity_sequences');
}
