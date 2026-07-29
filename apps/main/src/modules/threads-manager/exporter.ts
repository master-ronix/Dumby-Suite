import type { Knex } from 'knex';

/**
 * ThreadsManager exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportThreadsManagerData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_threads_manager_selftest').whereNull('deletedAt').select('*');
}
