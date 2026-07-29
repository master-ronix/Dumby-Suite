import type { Knex } from 'knex';

/**
 * Reminders exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportRemindersData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_reminders_selftest').whereNull('deletedAt').select('*');
}
