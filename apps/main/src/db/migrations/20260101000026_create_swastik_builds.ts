import type { Knex } from 'knex';
import { addTimestamps } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('swastik_builds', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('moduleSlug').notNullable();
    table
      .uuid('developerId')
      .notNullable()
      .references('id')
      .inTable('swastik_developers')
      .onDelete('CASCADE');
    table.string('version').notNullable();
    table.string('buildId').notNullable();
    table
      .enu('status', ['pending', 'signed', 'rejected', 'revoked'], {
        useNative: true,
        enumName: 'swastik_build_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.text('artifactRef').nullable();
    addTimestamps(knex, table);
    table.index(['moduleSlug']);
    table.index(['developerId']);
    table.unique(['moduleSlug', 'buildId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('swastik_builds');
  await knex.raw('drop type if exists swastik_build_status');
}
