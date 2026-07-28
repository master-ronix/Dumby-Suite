import type { Knex } from 'knex';

/**
 * Polls exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportPollsData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_polls_selftest').whereNull('deletedAt').select('*');
}
