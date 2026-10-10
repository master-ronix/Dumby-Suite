import type { Knex } from 'knex';
import { addTimestamps } from '../migration-helpers.js';

/**
 * BCCM (§17.7) — the per-guild daily command-create budget. Discord caps application command
 * creates at 200 per guild per rolling day. A batch reserves the new names it is about to create
 * *before* the send, so a crash between a successful PUT and the local commit cannot silently
 * undercount the budget. A reservation is confirmed on success, deleted on a clear failure, and
 * left in place on an uncertain outcome — where it expires with the window.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_command_daily_creates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('name').notNullable();
    table
      .enu('status', ['in-flight', 'confirmed'], {
        useNative: true,
        enumName: 'guild_command_create_status',
      })
      .notNullable();
    table.timestamp('expiresAt', { useTz: true }).notNullable();
    addTimestamps(knex, table);
    table.index(['guildId', 'expiresAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_command_daily_creates');
  await knex.raw('drop type if exists guild_command_create_status');
}
