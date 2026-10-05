import type { Knex } from 'knex';
import {
  addTimestamps,
  addSoftDelete,
  createPartialUniqueNotDeleted,
} from '../migration-helpers.js';

/**
 * §24 — Layer 2 blacklist. `expiresAt` is nullable (null ⇒ permanent). A global block (guildId
 * null) is unique per user; the partial index closes the "global-block uniqueness hole" where
 * Postgres treats NULL guildIds as distinct (Appendix C #14).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('blocked_users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('userId').notNullable();
    table.string('guildId').nullable();
    table.text('reason').notNullable();
    table.string('blockedBy').notNullable();
    table.timestamp('expiresAt', { useTz: true }).nullable();
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
  await knex.raw(
    'create unique index if not exists blocked_users_global_user_not_deleted_uq ' +
      'on ?? (??) where "guildId" is null and "deletedAt" is null',
    ['blocked_users', 'userId'],
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('blocked_users');
}
