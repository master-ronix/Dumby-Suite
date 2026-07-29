import type { Knex } from 'knex';

/**
 * Tickets exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportTicketsData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_tickets_selftest').whereNull('deletedAt').select('*');
}
