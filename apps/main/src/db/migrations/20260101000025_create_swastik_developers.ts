import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('swastik_developers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('discordUserId').notNullable();
    table.string('displayName').notNullable();
    table
      .enu('status', ['active', 'suspended'], {
        useNative: true,
        enumName: 'swastik_developer_status',
      })
      .notNullable()
      .defaultTo('active');
    addTimestamps(knex, table);
    addSoftDelete(table);
  });
  await knex.raw(
    'create unique index if not exists swastik_developers_discord_user_id_not_deleted_uq on swastik_developers ("discordUserId") where "deletedAt" is null',
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('swastik_developers');
  await knex.raw('drop type if exists swastik_developer_status');
}
