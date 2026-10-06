import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('guild_command_overrides', (table) => {
    table.string('guildId').nullable().alter();
  });

  await knex.raw(`
    create unique index if not exists guild_command_overrides_active_unique
    on guild_command_overrides ("guildId", "commandKey") nulls not distinct
    where "deletedAt" is null
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('drop index if exists guild_command_overrides_active_unique');
  await knex.schema.alterTable('guild_command_overrides', (table) => {
    table.string('guildId').notNullable().alter();
  });
}
