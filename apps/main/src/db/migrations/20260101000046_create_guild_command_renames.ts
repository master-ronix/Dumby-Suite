import type { Knex } from 'knex';
import {
  addTimestamps,
  addSoftDelete,
  createPartialUniqueNotDeleted,
} from '../migration-helpers.js';

/**
 * BCCM — the store of a guild's applied command renames. After the batch push, a command is
 * presented under its current name; this table is the single source of that mapping, keyed by the
 * registered command key. Surfaces (the `/queue` autocomplete among them) resolve a command's
 * current name from here rather than from the name it was registered under.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_command_renames', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('commandKey').notNullable();
    table.string('newName').notNullable();
    table.jsonb('aliases').notNullable().defaultTo('[]');
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId', 'commandKey']);
  });
  await createPartialUniqueNotDeleted(knex, 'guild_command_renames', ['guildId', 'commandKey']);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('drop index if exists guild_command_renames_guildId_commandKey_not_deleted_uq');
  await knex.schema.dropTableIfExists('guild_command_renames');
}
