import { describe, expect, test, vi } from 'vitest';
import { setGuildCommandPermissions } from '../../src/commands/command-access.js';

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
