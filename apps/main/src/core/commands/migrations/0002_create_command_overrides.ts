import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('guild_command_overrides');
  if (exists) return;
  await knex.schema.createTable('guild_command_overrides', (table) => {
    table.uuid('id').primary();
    table.string('guildId').notNullable();
    table.string('identityId').nullable();
    table.text('commandKey').notNullable();
    table.text('winningModuleSlug').notNullable();
    table.text('losingModuleSlug').notNullable();
    table.uuid('collisionId').nullable();
    table.timestamp('createdAt', { useTz: true }).notNullable();
    table.timestamp('updatedAt', { useTz: true }).notNullable();
    table.text('createdBy').notNullable();
    table.text('updatedBy').notNullable();
    table.unique(['guildId', 'identityId', 'commandKey'], 'gco_unique_command');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_command_overrides');
}
