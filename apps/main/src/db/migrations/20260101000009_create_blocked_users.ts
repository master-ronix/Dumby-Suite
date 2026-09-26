import type { Knex } from 'knex';
import {
  addTimestamps,
  addSoftDelete,
  createPartialUniqueNotDeleted,
} from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('blocked_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('userId').notNullable();
    table.string('guildId').nullable();
    table.text('reason').notNullable();
    table.string('blockedBy').notNullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['userId']);
    table.index(['guildId']);
  });
  await createPartialUniqueNotDeleted(
    knex,
    'blocked_users',
    ['userId', 'guildId'],
    'blocked_users_user_guild_not_deleted_uq',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('blocked_users');
}
