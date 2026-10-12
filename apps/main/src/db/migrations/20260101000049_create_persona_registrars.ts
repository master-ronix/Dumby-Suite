import type { Knex } from 'knex';
import { addSoftDelete, addTimestamps } from '../migration-helpers.js';

/**
 * UR-20261012-037 — the registrar registry.
 *
 * `registrarAuthority` was required by the persona registration API and then never checked: any
 * caller holding the internal API key could register a persona for any Discord application. This
 * table is what makes the field mean something — a persona may be registered only by an authority
 * recorded against that application.
 *
 * `discordApplicationId` of `''` means "any application" — a bootstrap/super registrar, so the
 * registry is not chicken-and-egg on a fresh install.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('persona_registrars', (table) => {
    table.string('authority').notNullable();
    table.string('discordApplicationId').notNullable().defaultTo('');
    table.string('grantedBy').notNullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.primary(['authority', 'discordApplicationId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('persona_registrars');
}
