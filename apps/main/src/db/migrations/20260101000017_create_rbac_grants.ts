import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rbac_grants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table
      .enu('level', ['role', 'group', 'set'], { useNative: true, enumName: 'rbac_grant_level' })
      .notNullable();
    table.string('levelRefId').notNullable();
    table
      .enu('grantType', ['permit', 'blacklist', 'whitelist', 'quota', 'cooldown'], {
        useNative: true,
        enumName: 'rbac_grant_type',
      })
      .notNullable();
    table.string('key').notNullable();
    table.integer('value').nullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['guildId', 'key']);
    table.index(['level', 'levelRefId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rbac_grants');
  await knex.raw('drop type if exists rbac_grant_level');
  await knex.raw('drop type if exists rbac_grant_type');
}
