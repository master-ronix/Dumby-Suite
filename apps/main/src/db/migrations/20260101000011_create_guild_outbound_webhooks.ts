import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_outbound_webhooks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.text('url').notNullable();
    table.string('secretRef').notNullable();
    table.jsonb('eventFilter').notNullable().defaultTo('[]');
    table.boolean('enabled').notNullable().defaultTo(true);
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_outbound_webhooks');
}
