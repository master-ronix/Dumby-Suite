import type { Knex } from 'knex';

/**
 * CoreAdmin exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportCoreAdminData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_core_admin_selftest').whereNull('deletedAt').select('*');
}
