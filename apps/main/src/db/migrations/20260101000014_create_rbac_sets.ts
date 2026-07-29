import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rbac_sets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').nullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rbac_sets');
}
