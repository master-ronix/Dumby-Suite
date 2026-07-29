import type { Knex } from 'knex';

/**
 * Logging exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportLoggingData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_logging_selftest').whereNull('deletedAt').select('*');
}
