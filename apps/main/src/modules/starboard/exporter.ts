import type { Knex } from 'knex';

/**
 * Starboard exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportStarboardData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_starboard_selftest').whereNull('deletedAt').select('*');
}
