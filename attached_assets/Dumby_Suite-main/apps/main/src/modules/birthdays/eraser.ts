import type { Knex } from 'knex';

/**
 * Birthdays eraser registration — deletes every self-test row this module
 * ever wrote, for a data-erasure request. Self-test rows carry no PII, so
 * this is a hard delete rather than a soft delete for this module.
 */
export async function eraseBirthdaysData(knex: Knex): Promise<{ deletedRows: number }> {
  const deletedRows = await knex('mod_birthdays_selftest').delete();
  return { deletedRows };
}
