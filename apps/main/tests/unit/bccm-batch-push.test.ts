import { describe, expect, test, vi } from 'vitest';
import type { CommandCeilingService } from '../../src/commands/command-ceiling.js';
import {
  applyBatch,
  newNames,
  runBccmBatchPush,
  type BccmBatchStore,
  type BccmDiscordClient,
  type BccmQueueEntry,
} from '../../src/commands/bccm-batch-push.js';

interface QueueRow {
  guildId: string;
  commandKey: string;
  action: string;
  newName?: string;
  alias?: string;
  status: 'pending' | 'completed';
}

class FakeStore implements BccmBatchStore {
  readonly renames: Array<{ guildId: string; commandKey: string; newName: string }> = [];
  readonly tally: Array<{ guildId: string; name: string; status: string; expiresAt: number }> = [];
  failCommitOnce = false;
  constructor(readonly queue: QueueRow[]) {}

  async pendingGuildIds(): Promise<readonly string[]> {
    return [...new Set(this.queue.filter((q) => q.status === 'pending').map((q) => q.guildId))];
  }
  async pendingEntries(guildId: string): Promise<readonly BccmQueueEntry[]> {
    return this.queue
      .filter((q) => q.guildId === guildId && q.status === 'pending')
      .map((q) => ({
        commandKey: q.commandKey,
        action: q.action,
        ...(q.newName !== undefined ? { newName: q.newName } : {}),
        ...(q.alias !== undefined ? { alias: q.alias } : {}),
      }));
  }
  async dailyUsed(guildId: string, nowMs: number): Promise<number> {
    const names = new Set(
      this.tally.filter((t) => t.guildId === guildId && t.expiresAt > nowMs).map((t) => t.name),
    );
    return names.size;
  }
  async reserve(guildId: string, names: readonly string[], nowMs: number): Promise<void> {
    for (const name of names) {
      this.tally.push({ guildId, name, status: 'in-flight', expiresAt: nowMs + 86_400_000 });
    }
  }
  async confirm(guildId: string, names: readonly string[]): Promise<void> {
    for (const t of this.tally) {
      if (t.guildId === guildId && t.status === 'in-flight' && names.includes(t.name)) {
        t.status = 'confirmed';
      }
    }
  }
  async dropReservations(guildId: string, names: readonly string[]): Promise<void> {
    for (let i = this.tally.length - 1; i >= 0; i -= 1) {
      const t = this.tally[i];
      if (t && t.guildId === guildId && t.status === 'in-flight' && names.includes(t.name)) {
        this.tally.splice(i, 1);
      }
    }
  }
  async commit(guildId: string, entries: readonly BccmQueueEntry[]): Promise<void> {
    if (this.failCommitOnce) {
      this.failCommitOnce = false;
      throw new Error('commit failed');
    }
    for (const e of entries) {
      if (e.action === 'rename' && e.newName !== undefined) {
        this.renames.push({ guildId, commandKey: e.commandKey, newName: e.newName });
      }
    }
    for (const q of this.queue) {
      if (
        q.guildId === guildId &&
        q.status === 'pending' &&
        entries.some((e) => e.commandKey === q.commandKey)
      ) {
        q.status = 'completed';
      }
    }
  }
}

class FakeDiscord implements BccmDiscordClient {
  registered: string[];
  readonly puts: string[][] = [];
  failWith: unknown = undefined;
  constructor(registered: string[]) {
    this.registered = registered;
  }
  async getRegistered(): Promise<readonly { name: string }[]> {
    return this.registered.map((name) => ({ name }));
  }
  async putCommands(_guildId: string, commands: readonly { name: string }[]): Promise<void> {
    if (this.failWith !== undefined) throw this.failWith;
    const names = commands.map((c) => c.name);
    this.puts.push(names);
    this.registered = names;
  }
}

const ceiling = { guard: async (): Promise<unknown> => ({}) } as unknown as CommandCeilingService;
const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

describe('bccm batch push — pure helpers', () => {
  test('applyBatch applies renames, aliases and disables', () => {
    expect(
      applyBatch(
        [{ name: 'ban' }, { name: 'kick' }],
        [
          { commandKey: 'ban', action: 'rename', newName: 'timeout' },
          { commandKey: 'kick', action: 'alias', alias: 'yeet' },
        ],
      ).sort(),
    ).toEqual(['kick', 'timeout', 'yeet']);
    expect(applyBatch([{ name: 'ban' }], [{ commandKey: 'ban', action: 'disable' }])).toEqual([]);
  });

  test('newNames diffs the desired set against the registered set', () => {
    expect(newNames([{ name: 'ban' }], ['ban', 'timeout'])).toEqual(['timeout']);
    expect(newNames([{ name: 'ban' }, { name: 'timeout' }], ['ban', 'timeout'])).toEqual([]);
  });
});

describe('bccm batch push — dry run', () => {
  test('changes nothing: queue, rename view and daily tally are all untouched', async () => {
    const store = new FakeStore([
      { guildId: 'g1', commandKey: 'ban', action: 'rename', newName: 'timeout', status: 'pending' },
    ]);
    const discord = new FakeDiscord(['ban', 'kick']);
    const report = await runBccmBatchPush({
      store,
      logger: logger() as never,
      ceiling,
      discord,
      dryRun: true,
    });

    expect(report.guilds[0]?.skippedReason).toBe('dry-run');
    expect(discord.puts).toEqual([]); // nothing sent
    expect(store.renames).toEqual([]); // rename view untouched
    expect(store.tally).toEqual([]); // daily tally untouched
    expect(store.queue[0]?.status).toBe('pending'); // queue untouched
  });
});

describe('bccm batch push — a normal cycle', () => {
  test('reserves, sends, confirms and commits', async () => {
    const store = new FakeStore([
      { guildId: 'g1', commandKey: 'ban', action: 'rename', newName: 'timeout', status: 'pending' },
    ]);
    const discord = new FakeDiscord(['ban', 'kick']);
    const report = await runBccmBatchPush({
      store,
      logger: logger() as never,
      ceiling,
      discord,
      dryRun: false,
    });

    expect(report.guilds[0]?.sent).toBe(true);
    expect(discord.puts).toEqual([['kick', 'timeout']]);
    expect(store.tally.map((t) => `${t.name}:${t.status}`)).toEqual(['timeout:confirmed']);
    expect(store.renames).toEqual([{ guildId: 'g1', commandKey: 'ban', newName: 'timeout' }]);
    expect(store.queue[0]?.status).toBe('completed');
  });
});

describe('bccm batch push — failure modes', () => {
  test('an over-limit rejection leaves the reservation in place and retries', async () => {
    const store = new FakeStore([
      { guildId: 'g1', commandKey: 'ban', action: 'rename', newName: 'timeout', status: 'pending' },
    ]);
    const discord = new FakeDiscord(['ban']);
    discord.failWith = Object.assign(new Error('limit'), { code: 30034 });
    const report = await runBccmBatchPush({
      store,
      logger: logger() as never,
      ceiling,
      discord,
      dryRun: false,
    });

    expect(report.guilds[0]?.skippedReason).toBe('over-limit');
    expect(store.tally.map((t) => t.status)).toEqual(['in-flight']); // reservation kept
    expect(store.queue[0]?.status).toBe('pending'); // batch not applied
  });

  test('a clear send failure drops the reservation', async () => {
    const store = new FakeStore([
      { guildId: 'g1', commandKey: 'ban', action: 'rename', newName: 'timeout', status: 'pending' },
    ]);
    const discord = new FakeDiscord(['ban']);
    discord.failWith = Object.assign(new Error('boom'), { code: 500 });
    const report = await runBccmBatchPush({
      store,
      logger: logger() as never,
      ceiling,
      discord,
      dryRun: false,
    });

    expect(report.guilds[0]?.skippedReason).toBe('put-failed');
    expect(store.tally).toEqual([]); // reservation dropped
    expect(store.queue[0]?.status).toBe('pending');
  });

  test('crash after a successful PUT: the next cycle converges, the tally stays right, the queue ends done', async () => {
    const store = new FakeStore([
      { guildId: 'g1', commandKey: 'ban', action: 'rename', newName: 'timeout', status: 'pending' },
    ]);
    const discord = new FakeDiscord(['ban', 'kick']);
    store.failCommitOnce = true;

    // Cycle 1: the PUT reaches Discord, then the commit fails.
    await expect(
      runBccmBatchPush({ store, logger: logger() as never, ceiling, discord, dryRun: false }),
    ).rejects.toThrow('commit failed');
    expect(store.queue[0]?.status).toBe('pending'); // batch still pending
    expect(store.tally.map((t) => `${t.name}:${t.status}`)).toEqual(['timeout:confirmed']);

    // Cycle 2: the re-push is idempotent (the name now exists), so it converges.
    const report = await runBccmBatchPush({
      store,
      logger: logger() as never,
      ceiling,
      discord,
      dryRun: false,
    });
    expect(report.guilds[0]?.newNames).toEqual([]); // nothing new — already created
    expect(store.queue[0]?.status).toBe('completed'); // queue ends done
    expect(store.renames).toEqual([{ guildId: 'g1', commandKey: 'ban', newName: 'timeout' }]);
    // Distinct names in the window — the same name is not counted twice.
    expect(await store.dailyUsed('g1', Date.now())).toBe(1);
  });
});
