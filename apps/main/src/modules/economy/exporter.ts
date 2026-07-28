import type { Knex } from 'knex';

/**
 * Economy exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportEconomyData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_economy_selftest').whereNull('deletedAt').select('*');
}
