import type { Knex } from 'knex';
import {
  addTimestamps,
  addSoftDelete,
  createPartialUniqueNotDeleted,
} from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_module_states', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('moduleSlug').notNullable();
    table.boolean('enabled').notNullable().defaultTo(true);
    table
      .enu('state', ['active', 'install_pending_resolution', 'degraded', 'disabled'], {
        useNative: true,
        enumName: 'guild_module_state',
      })
      .notNullable()
      .defaultTo('active');
    table.jsonb('config').notNullable().defaultTo('{}');
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId']);
    table.index(['moduleSlug']);
  });
  await createPartialUniqueNotDeleted(knex, 'guild_module_states', ['guildId', 'moduleSlug']);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_module_states');
  await knex.raw('drop type if exists guild_module_state');
}
