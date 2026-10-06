import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guilds', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('ownerDiscordId').notNullable();
    table.timestamp('joinedAt', { useTz: true }).notNullable();
    table.boolean('isActive').notNullable().defaultTo(true);
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['isActive']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guilds');
}
