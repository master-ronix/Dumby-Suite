import type { Knex } from 'knex';

/**
 * UR-20261012-081 — a persona's PRESENTATION: how its bot appears, and how it looks.
 *
 * Three optional, operator-supplied values carried by Twill registration and updatable afterwards:
 *
 * - `presenceStatus` — the bot's Discord presence: online / dnd / idle / invisible. Distinct from the
 *   `status` column, which is the persona's LIFECYCLE state (active / retired). The two are unrelated
 *   and conflating them would make "retire this persona" and "set its status to idle" the same write.
 * - `note` — the status quote shown beside the bot's name.
 * - `accent` — the hex accent colour for the persona's rendered surfaces.
 *
 * All nullable: absent means "not configured", which is the honest default and the state of every
 * existing persona. Nothing is backfilled, because there is nothing true to backfill it with.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.string('presenceStatus').nullable();
    table.string('note').nullable();
    table.string('accent').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.dropColumn('presenceStatus');
    table.dropColumn('note');
    table.dropColumn('accent');
  });
}
