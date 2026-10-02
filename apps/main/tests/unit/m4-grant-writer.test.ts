import { describe, expect, test } from 'vitest';
import {
  grantFromRow,
  grantToRow,
  InMemoryGrantWriter,
  PostgresGrantWriter,
  type RbacGrantRow,
} from '../../src/db/repositories/rbac-grant.repository.js';

describe('rbac grant row mapping (§21 Layer 7)', () => {
  test('rate-limit and the table quota enum round-trip', () => {
    const row = grantToRow({
      guildId: 'g1',
      level: 'role',
      refId: 'r1',
      type: 'rate-limit',
      key: 'browse.list',
      value: 10,
    });
    expect(row.grantType).toBe('quota');
    expect(row.levelRefId).toBe('r1');
    expect(grantFromRow(row)).toEqual({
      guildId: 'g1',
      level: 'role',
      refId: 'r1',
      type: 'rate-limit',
      key: 'browse.list',
      value: 10,
    });
  });

  test('a null value is omitted from the domain grant', () => {
    const grant = grantFromRow({
      guildId: 'g1',
      level: 'set',
      levelRefId: 's1',
      grantType: 'permit',
      key: 'queue.*',
      value: null,
    });
    expect(grant.type).toBe('permit');
    expect('value' in grant).toBe(false);
  });
});

describe('in-memory grant writer', () => {
  test('apply writes a grant that list returns; remove clears it', async () => {
    const writer = new InMemoryGrantWriter();
    const applied = await writer.apply({
      guildId: 'g1',
      tier: 'standard',
      key: 'browse.list',
      level: 'role',
      refId: 'r1',
      type: 'permit',
    });
    expect(applied.ok).toBe(true);
    expect(await writer.list('g1')).toHaveLength(1);
    await writer.remove({ guildId: 'g1', key: 'browse.list', level: 'role', refId: 'r1', type: 'permit' });
    expect(await writer.list('g1')).toHaveLength(0);
  });

  test('a core-tier key is refused by the boundary check', async () => {
    const writer = new InMemoryGrantWriter();
    const result = await writer.apply({
      guildId: 'g1',
      tier: 'core',
      key: 'health.check',
      level: 'role',
      refId: 'r1',
      type: 'permit',
    });
    expect(result.ok).toBe(false);
    expect(await writer.list('g1')).toHaveLength(0);
  });
});

/** Minimal thenable fake of the knex chain the Postgres writer uses. */
function fakeKnex() {
  const inserted: RbacGrantRow[] = [];
  const updates: Array<Record<string, unknown>> = [];
  let rows: RbacGrantRow[] = [];
  let mode: 'select' | 'insert' | 'update' = 'select';
  let lastWhere: Record<string, unknown> = {};
  const chain: Record<string, unknown> = {
    select: () => {
      mode = 'select';
      return chain;
    },
    where: (w: Record<string, unknown>) => {
      lastWhere = w;
      return chain;
    },
    whereNull: () => chain,
    insert: (row: RbacGrantRow) => {
      mode = 'insert';
      inserted.push(row);
      return chain;
    },
    update: (patch: Record<string, unknown>) => {
      mode = 'update';
      updates.push({ ...lastWhere, ...patch });
      return chain;
    },
    then: (resolve: (v: unknown) => void) => {
      resolve(mode === 'select' ? rows : undefined);
    },
  };
  const knex = (() => chain) as unknown as import('knex').Knex;
  return {
    knex,
    inserted,
    updates,
    setRows: (r: RbacGrantRow[]) => {
      rows = r;
    },
  };
}

describe('postgres grant writer (knex adapter)', () => {
  test('apply soft-deletes the prior grant then inserts the new one', async () => {
    const fake = fakeKnex();
    const writer = new PostgresGrantWriter(fake.knex);
    const result = await writer.apply({
      guildId: 'g1',
      tier: 'standard',
      key: 'browse.list',
      level: 'role',
      refId: 'r1',
      type: 'rate-limit',
      value: 5,
    });
    expect(result.ok).toBe(true);
    expect(fake.inserted).toHaveLength(1);
    expect(fake.inserted[0]?.grantType).toBe('quota');
    expect(fake.updates[0]?.deletedBy).toBe('grant-writer');
  });

  test('remove soft-deletes the matching grant', async () => {
    const fake = fakeKnex();
    const writer = new PostgresGrantWriter(fake.knex);
    await writer.remove({ guildId: 'g1', key: 'browse.list', level: 'role', refId: 'r1', type: 'permit' });
    expect(fake.updates[0]).toMatchObject({ guildId: 'g1', grantType: 'permit' });
  });

  test('a boundary violation is refused before any write', async () => {
    const fake = fakeKnex();
    const writer = new PostgresGrantWriter(fake.knex);
    const result = await writer.apply({
      guildId: 'g1',
      tier: 'core',
      key: 'health.check',
      level: 'role',
      refId: 'r1',
      type: 'permit',
    });
    expect(result.ok).toBe(false);
    expect(fake.inserted).toHaveLength(0);
    expect(fake.updates).toHaveLength(0);
  });
});
