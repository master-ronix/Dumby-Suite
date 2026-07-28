import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete, createPartialUniqueNotDeleted } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('nickname').nullable();
    table.timestamp('joinedAt', { useTz: true }).notNullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId']);
    table.index(['userId']);
  });
  await createPartialUniqueNotDeleted(knex, 'guild_members', ['guildId', 'userId']);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_members');
}
