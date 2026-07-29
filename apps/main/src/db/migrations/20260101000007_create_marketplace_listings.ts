import type { Knex } from 'knex';
import { addTimestamps, addSoftDelete } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('marketplace_listings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('moduleSlug').notNullable();
    table.uuid('developerId').notNullable();
    table.string('category').notNullable();
    table
      .enu('visibility', ['private', 'pending_review', 'public', 'revoked'], {
        useNative: true,
        enumName: 'marketplace_visibility',
      })
      .notNullable()
      .defaultTo('private');
    table.string('version').notNullable();
    table.text('signature').nullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.index(['moduleSlug']);
    table.index(['developerId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('marketplace_listings');
  await knex.raw('drop type if exists marketplace_visibility');
}
