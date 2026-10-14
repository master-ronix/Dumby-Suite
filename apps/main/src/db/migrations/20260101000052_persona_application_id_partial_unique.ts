import type { Knex } from 'knex';
import { createPartialUniqueNotDeleted } from '../migration-helpers.js';

/**
 * UR-20261012-084 — a revoked persona must free its application id.
 *
 * `20260101000034_align_persona_model` declared `discordApplicationId` with a PLAIN `.unique()`, which
 * constrains every row regardless of `deletedAt`. So revoking a persona soft-deleted it and left its
 * application id permanently taken: re-registering the same application failed with
 *
 *   duplicate key value violates unique constraint "persona_identities_discordapplicationid_unique"
 *
 * The revoke's whole point is that the application can be registered again — that is the difference
 * between "revoked" and "temporarily switched off", and it is what the revoke was documented to do.
 *
 * The corpus already has the correct shape: `createPartialUniqueNotDeleted` builds a unique index
 * `where "deletedAt" is null`, and every other soft-deletable table uses it. This migration replaces
 * the constraint with it, so uniqueness holds among LIVE personas and a soft-deleted row releases its
 * id.
 *
 * The index is created BEFORE the constraint is dropped, so there is no window in which an application
 * id is unconstrained.
 */
export async function up(knex: Knex): Promise<void> {
  await createPartialUniqueNotDeleted(knex, 'persona_identities', ['discordApplicationId']);
  await knex.raw('alter table ?? drop constraint if exists ??', [
    'persona_identities',
    'persona_identities_discordapplicationid_unique',
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('alter table ?? add constraint ?? unique (??)', [
    'persona_identities',
    'persona_identities_discordapplicationid_unique',
    'discordApplicationId',
  ]);
  await knex.raw('drop index if exists ??', [
    'persona_identities_discordApplicationId_not_deleted_uq',
  ]);
}
