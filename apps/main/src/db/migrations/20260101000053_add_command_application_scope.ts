import type { Knex } from 'knex';

/**
 * item 2 — BCCM is now PROFILE-context aware.
 *
 * A guild may host the main bot AND a persona in the same server, so command cosmetics (renames,
 * enabled/disabled overrides, the pending queue, and the daily-create counter) must be scoped by the
 * acting APPLICATION, not by the guild alone. Without this, a rename the main bot applies and one a
 * persona applies in the same guild would collide on `(guildId, commandKey)`.
 *
 * `''` is the main bot's scope, so every existing row and every existing behaviour is unchanged; a
 * persona's rows carry its own application id.
 */
const TABLES = [
  'guild_command_renames',
  'guild_command_overrides',
  'guild_command_queue',
  'guild_command_daily_creates',
] as const;

export async function up(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.string('applicationId').notNullable().defaultTo('');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn('applicationId');
    });
  }
}
