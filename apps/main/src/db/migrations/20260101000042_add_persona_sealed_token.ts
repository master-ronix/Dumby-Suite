import type { Knex } from 'knex';

/**
 * ADR-003 — a persona's bot token is a credential Twixter must read back in process, so it is
 * stored envelope-encrypted (the `sealed_credentials`-style fields) rather than only as a digest.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.jsonb('botTokenSealed').notNullable().defaultTo('{}');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.dropColumn('botTokenSealed');
  });
}
