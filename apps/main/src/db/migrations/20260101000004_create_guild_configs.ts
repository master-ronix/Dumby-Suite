import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../migration-helpers.js';

/**
 * §23.2/§23.3, §24 — `guild_configs` holds one row per guild, keyed by the guild id, with a
 * `settings` JSONB column validated against a Zod schema on every write and read.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_configs', (table) => {
    table.string('guildId').primary().references('id').inTable('guilds').onDelete('CASCADE');
    table.jsonb('settings').notNullable().defaultTo('{}');
    addTimestamps(knex, table);
    addSoftDelete(table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_configs');
}
