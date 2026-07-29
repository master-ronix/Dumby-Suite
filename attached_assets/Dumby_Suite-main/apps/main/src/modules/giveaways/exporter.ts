import type { Knex } from 'knex';

/**
 * Giveaways exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportGiveawaysData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_giveaways_selftest').whereNull('deletedAt').select('*');
}
