import type { Knex } from 'knex';

/**
 * Integrations exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportIntegrationsData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_integrations_selftest').whereNull('deletedAt').select('*');
}
