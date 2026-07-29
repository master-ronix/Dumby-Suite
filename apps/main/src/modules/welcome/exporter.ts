import type { Knex } from 'knex';

/**
 * Welcome exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportWelcomeData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_welcome_selftest').whereNull('deletedAt').select('*');
}
