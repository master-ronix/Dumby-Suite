import type { Knex } from 'knex';

/**
 * Leveling exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportLevelingData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_leveling_selftest').whereNull('deletedAt').select('*');
}
