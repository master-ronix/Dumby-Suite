import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete, createPartialUniqueNotDeleted } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('rbac_group_role_bindings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('groupId').notNullable().references('id').inTable('rbac_groups').onDelete('CASCADE');
    table.string('discordRoleId').notNullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['groupId']);
  });
  await createPartialUniqueNotDeleted(knex, 'rbac_group_role_bindings', ['groupId', 'discordRoleId']);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rbac_group_role_bindings');
}
