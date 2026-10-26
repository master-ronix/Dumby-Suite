import { describe, expect, test } from 'vitest';
import type { Knex } from 'knex';
import { createKnexBccmStore } from '../../src/commands/bccm-batch-push-store.js';

interface Call {
  table: string;
  method: string;
  args: unknown[];
}

/** A minimal chainable knex double: chains resolve to `rows`; writes resolve to a count. */
function fakeKnex(opts: { rows?: unknown[]; updateResult?: number } = {}): {
  knex: Knex;
  calls: Call[];
} {
  const calls: Call[] = [];
  const make = (table: string): Record<string, unknown> => {
    const b: Record<string, unknown> = {};
    for (const method of ['where', 'whereNull', 'whereIn', 'distinct', 'select', 'orderBy']) {
      b[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return b;
      };
    }
    b['insert'] = async (...args: unknown[]) => {
      calls.push({ table, method: 'insert', args });
      return [1];
    };
    b['update'] = async (...args: unknown[]) => {
      calls.push({ table, method: 'update', args });
      return opts.updateResult ?? 1;
    };
    b['delete'] = async (...args: unknown[]) => {
      calls.push({ table, method: 'delete', args });
      return 1;
    };
    b['then'] = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(opts.rows ?? []).then(resolve);
    return b;
  };
  const knex = ((table: string) => {
    calls.push({ table, method: '__call', args: [] });
    return make(table);
  }) as unknown as Record<string, unknown>;
  knex['transaction'] = async (fn: (trx: unknown) => Promise<void>) => {
    calls.push({ table: '__tx', method: 'transaction', args: [] });
    const trx = ((table: string) => {
      calls.push({ table, method: '__call', args: [] });
      return make(table);
    }) as unknown as Record<string, unknown>;
    trx['fn'] = { now: () => new Date() };
    await fn(trx);
  };
  knex['fn'] = { now: () => new Date() };
  return { knex: knex as unknown as Knex, calls };
}

describe('knex bccm store', () => {
  test('pendingGuildIds and dailyUsed read their rows', async () => {
    const { knex } = fakeKnex({ rows: [{ guildId: 'g1' }, { guildId: 'g2' }] });
    expect(await createKnexBccmStore(knex).pendingGuildIds('')).toEqual(['g1', 'g2']);
  });

  test('pendingEntries projects the queue payload', async () => {
    const { knex } = fakeKnex({
      rows: [
        { commandKey: 'ban', payload: { action: 'rename', newName: 'timeout' } },
        { commandKey: 'kick' },
      ],
    });
    expect(await createKnexBccmStore(knex).pendingEntries('g1', '')).toEqual([
      { commandKey: 'ban', action: 'rename', newName: 'timeout' },
      { commandKey: 'kick', action: 'rename' },
    ]);
  });

  test('dailyUsed counts the rows within the window', async () => {
    const { knex } = fakeKnex({ rows: [{ name: 'a' }, { name: 'b' }] });
    expect(await createKnexBccmStore(knex).dailyUsed('g1', '', Date.now())).toBe(2);
  });

  test('reserve inserts when there are names and is a no-op when there are none', async () => {
    const { knex, calls } = fakeKnex();
    const store = createKnexBccmStore(knex);
    await store.reserve('g1', '', ['a'], Date.now());
    expect(calls.some((c) => c.method === 'insert')).toBe(true);
    calls.length = 0;
    await store.reserve('g1', '', [], Date.now());
    expect(calls.some((c) => c.method === 'insert')).toBe(false);
  });

  test('confirm and dropReservations are no-ops on an empty name set', async () => {
    const { knex, calls } = fakeKnex();
    const store = createKnexBccmStore(knex);
    await store.confirm('g1', '', ['a']);
    await store.dropReservations('g1', '', ['a']);
    expect(calls.some((c) => c.method === 'update')).toBe(true);
    expect(calls.some((c) => c.method === 'delete')).toBe(true);
    calls.length = 0;
    await store.confirm('g1', '', []);
    await store.dropReservations('g1', '', []);
    expect(calls.some((c) => c.method === 'update' || c.method === 'delete')).toBe(false);
  });

  test('commit updates an existing rename and marks the queue done', async () => {
    const { knex, calls } = fakeKnex({ updateResult: 1 });
    await createKnexBccmStore(knex).commit('g1', '', [
      { commandKey: 'ban', action: 'rename', newName: 'timeout' },
    ]);
    expect(calls.some((c) => c.table === 'guild_command_renames' && c.method === 'update')).toBe(
      true,
    );
    expect(calls.some((c) => c.table === 'guild_command_renames' && c.method === 'insert')).toBe(
      false,
    );
    expect(calls.some((c) => c.table === 'guild_command_queue' && c.method === 'update')).toBe(
      true,
    );
  });

  test('commit inserts a rename when none exists and skips non-rename entries', async () => {
    const { knex, calls } = fakeKnex({ updateResult: 0 });
    await createKnexBccmStore(knex).commit('g1', '', [
      { commandKey: 'ban', action: 'rename', newName: 'timeout' },
      { commandKey: 'kick', action: 'disable' },
    ]);
    expect(calls.some((c) => c.table === 'guild_command_renames' && c.method === 'insert')).toBe(
      true,
    );
    expect(calls.some((c) => c.table === 'guild_command_queue' && c.method === 'update')).toBe(
      true,
    );
  });
});

describe('scope isolation', () => {
  test('reads and writes carry the acting application scope', async () => {
    const { knex, calls } = fakeKnex();
    const store = createKnexBccmStore(knex);
    await store.reserve('g1', 'appA', ['x'], 1000);
    expect(calls.find((c) => c.method === 'insert')?.args[0]).toEqual([
      expect.objectContaining({ guildId: 'g1', applicationId: 'appA', name: 'x' }),
    ]);
    calls.length = 0;
    await store.pendingEntries('g1', 'appA');
    expect(calls.find((c) => c.method === 'where')?.args[0]).toEqual({
      guildId: 'g1',
      applicationId: 'appA',
      status: 'pending',
    });
  });

  test("the main bot's scope is the '' sentinel the migration backfills", async () => {
    const { knex, calls } = fakeKnex();
    await createKnexBccmStore(knex).pendingGuildIds('');
    expect(calls.find((c) => c.method === 'where')?.args[0]).toEqual({
      status: 'pending',
      applicationId: '',
    });
  });
});

// RT-17 — the batch is a REPLAY, so the queue must hand back a chronology, not a set.
describe('pendingEntries is ordered, because applyBatch replays it (RT-17)', () => {
  test('orders by createdAt then id', async () => {
    const { knex, calls } = fakeKnex({ rows: [] });
    const store = createKnexBccmStore(knex);
    await store.pendingEntries('g1', 'app-1');

    const orderBy = calls.filter((c) => c.method === 'orderBy').at(-1);
    expect(orderBy).toBeDefined();
    // One call carrying both keys, in this order: createdAt first (the queue's own chronology), id to
    // break a tie between rows written in the same millisecond.
    expect(orderBy?.args[0]).toEqual([
      { column: 'createdAt', order: 'asc' },
      { column: 'id', order: 'asc' },
    ]);
  });
});
