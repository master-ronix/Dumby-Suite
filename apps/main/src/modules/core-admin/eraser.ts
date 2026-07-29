import type { Knex } from 'knex';

/**
 * CoreAdmin eraser registration — deletes every self-test row this module
 * ever wrote, for a data-erasure request. Self-test rows carry no PII, so
 * this is a hard delete rather than a soft delete for this module.
 */
export async function eraseCoreAdminData(knex: Knex): Promise<{ deletedRows: number }> {
  const deletedRows = await knex('mod_core_admin_selftest').delete();
  return { deletedRows };
}
