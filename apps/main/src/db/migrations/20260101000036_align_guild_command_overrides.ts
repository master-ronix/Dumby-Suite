import type { Knex } from 'knex';

/**
 * Align guild_command_overrides with the fleet-wide kill switch contract
 * (UR-A-10 / UR-B-07): guildId must be NULLABLE so a NULL row means
 * "disabled fleet-wide", and the unique target for the suspendCommand upsert
 * is a partial unique index over (guildId, commandKey) for live rows. The
 * original migration made guildId NOT NULL, so the suspendCommand insert
 * (which omits a guild) could never succeed.
 */
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
