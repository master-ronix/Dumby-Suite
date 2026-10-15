import { describe, expect, test, vi } from 'vitest';
import {
  deleteGuildCommands,
  setGuildCommandPermissions,
} from '../../src/commands/command-access.js';

function fakeFetch(result: { ok: boolean; status: number }): typeof fetch {
  return vi.fn(async () => result) as unknown as typeof fetch;
}

describe('setGuildCommandPermissions', () => {
  test('skips and warns when no Bearer token is configured', async () => {
    const warn = vi.fn();
    const applied = await setGuildCommandPermissions({
      token: '',
      applicationId: 'app',
      guildId: 'guild',
      registered: [{ id: '1', name: 'hello' }],
      commandNames: new Set(['hello']),
      allowed: false,
      logger: { warn },
      fetchImpl: fakeFetch({ ok: true, status: 200 }),
    });
    expect(applied).toBe(0);
    expect(warn).toHaveBeenCalledWith('command-access-token-missing', expect.anything());
  });

  test('writes the override only for the module commands', async () => {
    const fetchImpl = fakeFetch({ ok: true, status: 200 });
    const applied = await setGuildCommandPermissions({
      token: 'bearer',
      applicationId: 'app',
      guildId: 'guild',
      registered: [
        { id: '1', name: 'hello' },
        { id: '2', name: 'unrelated' },
      ],
      commandNames: new Set(['hello']),
      allowed: false,
      logger: { warn: vi.fn() },
      fetchImpl,
    });
    expect(applied).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('logs a failure for a non-2xx response', async () => {
    const warn = vi.fn();
    const applied = await setGuildCommandPermissions({
      token: 'bearer',
      applicationId: 'app',
      guildId: 'guild',
      registered: [{ id: '1', name: 'hello' }],
      commandNames: new Set(['hello']),
      allowed: true,
      logger: { warn },
      fetchImpl: fakeFetch({ ok: false, status: 403 }),
    });
    expect(applied).toBe(0);
    expect(warn).toHaveBeenCalledWith('command-access-set-failed', expect.anything());
  });

  test('logs a failure when the request throws', async () => {
    const warn = vi.fn();
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const applied = await setGuildCommandPermissions({
      token: 'bearer',
      applicationId: 'app',
      guildId: 'guild',
      registered: [{ id: '1', name: 'hello' }],
      commandNames: new Set(['hello']),
      allowed: true,
      logger: { warn },
      fetchImpl,
    });
    expect(applied).toBe(0);
    expect(warn).toHaveBeenCalledWith('command-access-set-failed', expect.anything());
  });
});

describe('deleteGuildCommands (Route B)', () => {
  test('deletes only the module commands with the application bot token', async () => {
    const calls: Array<{ url: string; init: unknown }> = [];
    const fetchImpl = (async (url: string, init: unknown) => {
      calls.push({ url, init });
      return { ok: true, status: 204 };
    }) as unknown as typeof fetch;
    const removed = await deleteGuildCommands({
      botToken: 'bot-token',
      applicationId: 'app',
      guildId: 'guild',
      registered: [
        { id: '1', name: 'hello' },
        { id: '2', name: 'unrelated' },
      ],
      commandNames: new Set(['hello']),
      logger: { warn: vi.fn() },
      fetchImpl,
    });
    expect(removed).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain('/applications/app/guilds/guild/commands/1');
    expect((calls[0]?.init as { method: string }).method).toBe('DELETE');
  });

  test('counts a 404 as already removed', async () => {
    const removed = await deleteGuildCommands({
      botToken: 'bot-token',
      applicationId: 'app',
      guildId: 'guild',
      registered: [{ id: '1', name: 'hello' }],
      commandNames: new Set(['hello']),
      logger: { warn: vi.fn() },
      fetchImpl: fakeFetch({ ok: false, status: 404 }),
    });
    expect(removed).toBe(1);
  });

  test('warns and does nothing without a bot token', async () => {
    const warn = vi.fn();
    const removed = await deleteGuildCommands({
      botToken: '',
      applicationId: 'app',
      guildId: 'guild',
      registered: [{ id: '1', name: 'hello' }],
      commandNames: new Set(['hello']),
      logger: { warn },
      fetchImpl: fakeFetch({ ok: true, status: 204 }),
    });
    expect(removed).toBe(0);
    expect(warn).toHaveBeenCalledWith('command-access-bot-token-missing', expect.anything());
  });

  test('warns and continues when a delete fails', async () => {
    const warn = vi.fn();
    const removed = await deleteGuildCommands({
      botToken: 'bot-token',
      applicationId: 'app',
      guildId: 'guild',
      registered: [{ id: '1', name: 'hello' }],
      commandNames: new Set(['hello']),
      logger: { warn },
      fetchImpl: fakeFetch({ ok: false, status: 500 }),
    });
    expect(removed).toBe(0);
    expect(warn).toHaveBeenCalledWith('command-access-delete-failed', expect.anything());
  });
});
