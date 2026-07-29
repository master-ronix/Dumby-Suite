import type { Knex } from 'knex';

/**
 * Birthdays exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportBirthdaysData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_birthdays_selftest').whereNull('deletedAt').select('*');
}
