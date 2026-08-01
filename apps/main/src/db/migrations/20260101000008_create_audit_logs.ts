import type { Knex } from 'knex';

/**
 * audit_logs is insert-only (spec section 15): no updatedAt/deletedAt
 * columns exist at all, and InsertOnlyRepository (see
 * src/db/repositories/base.repository.ts) refuses update()/delete() at
 * the application layer. A DB-level trigger is added as a second,
 * independent enforcement layer (defense in depth) so the guarantee holds
 * even against a direct psql session.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('actorId').notNullable();
    table.string('source').notNullable();
    table.string('action').notNullable();
    table.text('reason').notNullable();
    table
      .enu('outcome', ['allowed', 'rejected'], { useNative: true, enumName: 'audit_outcome' })
      .notNullable();
    table.string('rejectionReason').nullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['actorId']);
    table.index(['action']);
    table.index(['createdAt']);
  });

  await knex.raw(`
    create or replace function audit_logs_forbid_mutation() returns trigger as $$
    begin
      raise exception 'audit_logs is insert-only: % is forbidden', TG_OP;
    end;
    $$ language plpgsql;
  `);
  await knex.raw(`
    create trigger audit_logs_no_update
    before update on audit_logs
    for each row execute function audit_logs_forbid_mutation();
  `);
  await knex.raw(`
    create trigger audit_logs_no_delete
    before delete on audit_logs
    for each row execute function audit_logs_forbid_mutation();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('drop trigger if exists audit_logs_no_update on audit_logs');
  await knex.raw('drop trigger if exists audit_logs_no_delete on audit_logs');
  await knex.raw('drop function if exists audit_logs_forbid_mutation()');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.raw('drop type if exists audit_outcome');
}
