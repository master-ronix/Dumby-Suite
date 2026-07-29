import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('api_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('userId').notNullable();
    table.text('sessionTokenHash').notNullable();
    table.timestamp('expiresAt', { useTz: true }).notNullable();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('revokedAt', { useTz: true }).nullable();
    table.index(['userId']);
    table.index(['expiresAt']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('api_sessions');
}
