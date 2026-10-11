import { describe, expect, test, vi } from 'vitest';
import {
  CommandPermissionTokenService,
  COMMAND_PERMISSION_SCOPE,
  OAuth2RefreshError,
} from '../../src/commands/command-permission-tokens.js';

type Any = Record<string, unknown>;

function makeService(overrides: Any = {}) {
  const rows = new Map<string, Any>();
  const values = new Map<string, string>();
  let n = 0;
  const store = {
    upsert: vi.fn(async (r: Any) => {
      rows.set(r['guildId'] as string, r);
    }),
    findByGuild: vi.fn(async (g: string) => rows.get(g)),
    listRefreshable: vi.fn(async () => [...rows.values()].filter((r) => r['status'] === 'active')),
    setStatus: vi.fn(async (g: string, s: string) => {
      const r = rows.get(g);
      if (r === undefined) return false;
      rows.set(g, { ...r, status: s });
      return true;
    }),
    recordRefresh: vi.fn(async (g: string, next: Any) => {
      const r = rows.get(g);
      if (r === undefined) return false;
      rows.set(g, { ...r, ...next, status: 'active' });
      return true;
    }),
  };
  const sealer = {
    issue: vi.fn(async (_l: string, _b: string, value: string) => {
      const credentialId = `cred-${++n}`;
      values.set(credentialId, value);
      return { credentialId };
    }),
    read: vi.fn(async (id: string) => {
      const v = values.get(id);
      if (v === undefined) throw new Error('missing');
      return v;
    }),
    revoke: vi.fn(async () => true),
  };
  const refresher = {
    refreshToken: vi.fn(async () => ({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 604800,
    })),
  };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  let clock = 1_000_000;
  const service = new CommandPermissionTokenService({
    store,
    sealer,
    refresher,
    logger,
    now: () => clock,
    // Large enough that the 2-second fixtures count as "near expiry" and the 7-day one does not.
    refreshLeadMs: 1_000_000,
    ...overrides,
  } as never);
  return {
    service,
    store,
    sealer,
    refresher,
    logger,
    rows,
    values,
    setClock: (v: number) => {
      clock = v;
    },
  };
}

describe('CommandPermissionTokenService', () => {
  test('connect seals the token set and resolveAccessToken returns the live token', async () => {
    const { service, rows, values } = makeService();
    await service.connect('g1', 'u1', {
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 604800,
      scope: COMMAND_PERMISSION_SCOPE,
    });
    expect(rows.get('g1')).toBeDefined();
    expect([...values.values()]).toEqual(['access-1', 'refresh-1']);
    expect(await service.resolveAccessToken('g1')).toBe('access-1');
  });

  test('resolveAccessToken returns undefined with no row, a non-active status, or an expired token', async () => {
    const { service, setClock } = makeService();
    expect(await service.resolveAccessToken('none')).toBeUndefined();
    await service.connect('g2', 'u2', {
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 10,
      scope: COMMAND_PERMISSION_SCOPE,
    });
    setClock(1_000_000 + 20_000);
    expect(await service.resolveAccessToken('g2')).toBeUndefined();
  });

  test('status reports none / active / revoked', async () => {
    const { service, store } = makeService();
    expect(await service.status('none')).toBe('none');
    await service.connect('g3', 'u3', {
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 604800,
      scope: COMMAND_PERMISSION_SCOPE,
    });
    expect(await service.status('g3')).toBe('active');
    await store.setStatus('g3', 'revoked');
    expect(await service.status('g3')).toBe('revoked');
  });

  test('refreshDue refreshes a near-expiry token and stores the rotated refresh token', async () => {
    const { service, refresher, rows } = makeService();
    await service.connect('g4', 'u4', {
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresIn: 2,
      scope: COMMAND_PERMISSION_SCOPE,
    });
    const result = await service.refreshDue();
    expect(result.refreshed).toBe(1);
    expect(refresher.refreshToken).toHaveBeenCalledWith('old-refresh');
    expect(await service.resolveAccessToken('g4')).toBe('new-access');
    expect(rows.get('g4')?.['status']).toBe('active');
  });

  test('refreshDue marks the guild revoked when Discord refuses the refresh', async () => {
    const { service, refresher } = makeService();
    await service.connect('g5', 'u5', {
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 2,
      scope: COMMAND_PERMISSION_SCOPE,
    });
    refresher.refreshToken.mockRejectedValueOnce(new OAuth2RefreshError('nope', 401));
    const result = await service.refreshDue();
    expect(result.revoked).toBe(1);
    expect(await service.status('g5')).toBe('revoked');
  });

  test('refreshDue marks revoked when the stored refresh token is unreadable', async () => {
    const { service, sealer } = makeService();
    await service.connect('g7', 'u7', {
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 2,
      scope: COMMAND_PERMISSION_SCOPE,
    });
    sealer.read.mockImplementationOnce(async () => {
      throw new Error('gone');
    });
    const result = await service.refreshDue();
    expect(result.revoked).toBe(1);
    expect(await service.status('g7')).toBe('revoked');
  });

  test('refreshDue skips a token that is not yet near expiry', async () => {
    const { service, refresher } = makeService();
    await service.connect('g6', 'u6', {
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 604800,
      scope: COMMAND_PERMISSION_SCOPE,
    });
    const result = await service.refreshDue();
    expect(result).toEqual({ refreshed: 0, revoked: 0 });
    expect(refresher.refreshToken).not.toHaveBeenCalled();
  });
});
