import type { Knex } from 'knex';

/**
 * Utility exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportUtilityData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_utility_selftest').whereNull('deletedAt').select('*');
}
