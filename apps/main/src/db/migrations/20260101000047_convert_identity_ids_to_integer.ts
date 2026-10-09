import type { Knex } from 'knex';

/**
 * UR-007 / UR-008 — convert the identity id columns from text to integer on an existing database.
 *
 * The numeric-id change (ADR-016) edits the original migrations, so a fresh database is created
 * with integer columns already. An existing database still carries the original text columns and
 * the `knex_migrations` rows that record them as run — those migrations will not re-run, so this
 * forward migration converts the columns in place, remapping the old text ids to numbers
 * deterministically and moving the foreign keys with them.
 *
 * The mapping is stable: the first-party developer is pinned to 1 and the rest are numbered in
 * sorted order; build numbers are assigned the same way. The migration is guarded — if a column is
 * already integer it is left alone, so it is safe on both a fresh and an existing database.
 */
const DEV_COLUMNS: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'builds', column: 'devId' },
  { table: 'licenses', column: 'subjectDevId' },
  { table: 'deployment_records', column: 'devId' },
  { table: 'modules', column: 'ownerDevId' },
];

async function columnType(knex: Knex, table: string, column: string): Promise<string | undefined> {
  const row = (await knex.raw(
    `select data_type from information_schema.columns
     where table_name = ? and column_name = ?`,
    [table, column],
  )) as { rows?: Array<{ data_type?: string }> };
  return row.rows?.[0]?.data_type;
}

function isText(type: string | undefined): boolean {
  return type === 'text' || type === 'character varying' || type === 'character';
}

/** Drop every foreign key that covers a column, whatever Postgres named it. */
async function dropForeignKeysOn(knex: Knex, table: string, column: string): Promise<void> {
  const res = (await knex.raw(
    `select con.conname as name
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
     where rel.relname = ? and con.contype = 'f' and att.attname = ?`,
    [table, column],
  )) as { rows?: Array<{ name?: string }> };
  for (const row of res.rows ?? []) {
    if (typeof row.name === 'string') await knex.raw(`alter table ?? drop constraint ??`, [table, row.name]);
  }
}

export async function up(knex: Knex): Promise<void> {
  // Only an existing (text-typed) database needs converting; a fresh one is already integer.
  if (!isText(await columnType(knex, 'developers', 'devId'))) return;

  // 1. deterministic maps, built before anything is altered.
  await knex.raw(`create temporary table dev_id_map as
    select "devId" as old_id,
           row_number() over (order by ("devId" = 'dev_first_party') desc, "devId")::bigint as new_id
    from developers`);
  await knex.raw(`create temporary table build_id_map as
    select "buildId" as old_id, row_number() over (order by "buildId")::bigint as new_id
    from builds`);

  // 2. drop the foreign keys that reference developers.devId.
  for (const { table, column } of DEV_COLUMNS) {
    await dropForeignKeysOn(knex, table, column);
  }

  // 3. convert developers.devId (the referenced primary key).
  await knex.raw(`alter table developers drop constraint if exists developers_pkey`);
  await knex.raw(`alter table developers add column dev_id_new bigint`);
  await knex.raw(`update developers d set dev_id_new = m.new_id from dev_id_map m where m.old_id = d."devId"`);
  await knex.raw(`alter table developers drop column "devId"`);
  await knex.raw(`alter table developers rename column dev_id_new to "devId"`);
  await knex.raw(`alter table developers alter column "devId" set not null`);
  await knex.raw(`alter table developers add primary key ("devId")`);

  // 4. convert each referencing column.
  for (const { table, column } of DEV_COLUMNS) {
    await knex.raw(`alter table ?? add column ${column}_new bigint`, [table]);
    await knex.raw(
      `update ?? t set ${column}_new = m.new_id from dev_id_map m where m.old_id = t.??`,
      [table, column],
    );
    await knex.raw(`alter table ?? drop column ??`, [table, column]);
    await knex.raw(`alter table ?? rename column ${column}_new to ${column}`, [table]);
    await knex.raw(`alter table ?? alter column ${column} set not null`, [table]);
    await knex.raw(`alter table ?? add constraint ?? foreign key (${column}) references developers("devId")`, [
      table,
      `${table}_${column}_foreign`,
    ]);
  }

  // 5. convert builds.buildId (primary key) and every column that carries it.
  await knex.raw(`alter table builds drop constraint if exists builds_pkey`);
  await knex.raw(`alter table builds add column build_id_new bigint`);
  await knex.raw(`update builds b set build_id_new = m.new_id from build_id_map m where m.old_id = b."buildId"`);
  await knex.raw(`alter table builds drop column "buildId"`);
  await knex.raw(`alter table builds rename column build_id_new to "buildId"`);
  await knex.raw(`alter table builds alter column "buildId" set not null`);
  await knex.raw(`alter table builds add primary key ("buildId")`);

  await knex.raw(`alter table deployment_records add column build_id_new bigint`);
  await knex.raw(
    `update deployment_records t set build_id_new = m.new_id from build_id_map m where m.old_id = t."buildId"`,
  );
  await knex.raw(`alter table deployment_records drop column "buildId"`);
  await knex.raw(`alter table deployment_records rename column build_id_new to "buildId"`);
  await knex.raw(`alter table deployment_records alter column "buildId" set not null`);

  await knex.raw(`drop table dev_id_map`);
  await knex.raw(`drop table build_id_map`);
}

export async function down(): Promise<void> {
  // The text ids are not recoverable once remapped; a downgrade restores the schema, not the ids.
  throw new Error('identity-id conversion is not reversible');
}
