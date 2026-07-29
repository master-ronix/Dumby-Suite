import type { Knex } from 'knex';

/**
 * GuildSettings exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportGuildSettingsData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_guild_settings_selftest').whereNull('deletedAt').select('*');
}
