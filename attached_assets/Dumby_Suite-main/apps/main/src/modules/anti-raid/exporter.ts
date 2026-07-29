import type { Knex } from 'knex';

/**
 * AntiRaid exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportAntiRaidData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_anti_raid_selftest').whereNull('deletedAt').select('*');
}
