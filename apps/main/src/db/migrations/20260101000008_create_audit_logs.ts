import type { Knex } from 'knex';

/**
 * §24.2.1 — `audit_logs` is append-only and grows without bound, so it is **range-partitioned by
 * `createdAt`** (PostgreSQL declarative partitioning). Retention is partition-drop only (the
 * monthly job in `db/audit-partition-manager.ts` creates the next partition and drops expired
 * ones). The primary key includes the partition key, as Postgres requires.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`create type audit_outcome as enum ('allowed', 'rejected')`);
  await knex.raw(`
    create table audit_logs (
      id uuid not null default gen_random_uuid(),
      "actorId" text not null,
      source text not null,
      action text not null,
      reason text not null,
      outcome audit_outcome not null,
      "rejectionReason" text,
      metadata jsonb not null default '{}',
      "createdAt" timestamptz not null default now(),
      primary key (id, "createdAt")
    ) partition by range ("createdAt")
  `);
  await knex.raw(`create index audit_logs_actor_idx on audit_logs ("actorId")`);
  await knex.raw(`create index audit_logs_action_idx on audit_logs (action)`);
  await knex.raw(`create index audit_logs_created_idx on audit_logs ("createdAt")`);

  await knex.raw(`
    create table if not exists audit_logs_2026_01 partition of audit_logs
      for values from ('2026-01-01') to ('2026-02-01')
  `);
  await knex.raw(`
    create table if not exists audit_logs_2026_02 partition of audit_logs
      for values from ('2026-02-01') to ('2026-03-01')
  `);

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
