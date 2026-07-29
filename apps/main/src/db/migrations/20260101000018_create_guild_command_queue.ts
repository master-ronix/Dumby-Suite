import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_command_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('commandKey').notNullable();
    table.jsonb('payload').notNullable().defaultTo('{}');
    table
      .enu('status', ['pending', 'processing', 'completed', 'failed'], {
        useNative: true,
        enumName: 'guild_command_queue_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('scheduledFor', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId', 'status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_command_queue');
  await knex.raw('drop type if exists guild_command_queue_status');
}
