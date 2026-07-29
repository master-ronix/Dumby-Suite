import type { Knex } from 'knex';

/**
 * Tags eraser registration — deletes every self-test row this module
 * ever wrote, for a data-erasure request. Self-test rows carry no PII, so
 * this is a hard delete rather than a soft delete for this module.
 */
export async function eraseTagsData(knex: Knex): Promise<{ deletedRows: number }> {
  const deletedRows = await knex('mod_tags_selftest').delete();
  return { deletedRows };
}
