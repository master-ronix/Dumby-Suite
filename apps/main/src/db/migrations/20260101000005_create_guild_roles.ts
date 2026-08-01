import type { Knex } from 'knex';
import {
  addTimestamps,
  addSoftDelete,
  createPartialUniqueNotDeleted,
} from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('discordRoleId').notNullable();
    table.string('name').notNullable();
    table.integer('position').notNullable().defaultTo(0);
    table.bigInteger('permissionsBitfield').notNullable().defaultTo(0);
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId']);
  });
  await createPartialUniqueNotDeleted(knex, 'guild_roles', ['guildId', 'discordRoleId']);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_roles');
}
