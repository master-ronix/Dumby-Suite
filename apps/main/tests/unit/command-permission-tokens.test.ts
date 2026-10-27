import { describe, expect, test, vi } from 'vitest';
import {
  CommandPermissionTokenService,
  COMMAND_PERMISSION_SCOPE,
  OAuth2RefreshError,
} from '../../src/commands/command-permission-tokens.js';

type Any = Record<string, unknown>;

/** UR-20261012-028 — the store is keyed by (applicationId, guildId), so the fixture is too. */
const key = (applicationId: string, guildId: string): string => `${applicationId}:${guildId}`;

function makeService(overrides: Any = {}) {
  const rows = new Map<string, Any>();
  const values = new Map<string, string>();
  let n = 0;
  const store = {
    upsert: vi.fn(async (r: Any) => {
      rows.set(key(r['applicationId'] as string, r['guildId'] as string), r);
    }),
    findByApplicationGuild: vi.fn(async (a: string, g: string) => rows.get(key(a, g))),
    listRefreshable: vi.fn(async () => [...rows.values()].filter((r) => r['status'] === 'active')),
    setStatus: vi.fn(async (a: string, g: string, s: string) => {
      const r = rows.get(key(a, g));
      if (r === undefined) return false;
      rows.set(key(a, g), { ...r, status: s });
      return true;
    }),
    adoptLegacy: vi.fn(async () => 0),
    recordRefresh: vi.fn(async (a: string, g: string, next: Any) => {
      const r = rows.get(key(a, g));
      if (r === undefined) return false;
      rows.set(key(a, g), { ...r, ...next, status: 'active' });
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

const tokens = (accessToken: string, refreshToken: string, expiresIn: number): Any => ({
  accessToken,
  refreshToken,
  expiresIn,
  scope: COMMAND_PERMISSION_SCOPE,
});

describe('CommandPermissionTokenService', () => {
  test('connect seals the token set and resolveAccessToken returns the live token', async () => {
    const { service, rows, values } = makeService();
    await service.connect('app1', 'g1', 'u1', tokens('access-1', 'refresh-1', 604800));
    expect(rows.get('app1:g1')).toBeDefined();
    expect([...values.values()]).toEqual(['access-1', 'refresh-1']);
    expect(await service.resolveAccessToken('app1', 'g1')).toBe('access-1');
  });

  test('tokens are held per application: another application in the same guild has none', async () => {
    const { service } = makeService();
    await service.connect('app1', 'g1', 'u1', tokens('access-1', 'refresh-1', 604800));
    expect(await service.resolveAccessToken('app1', 'g1')).toBe('access-1');
    expect(await service.resolveAccessToken('app2', 'g1')).toBeUndefined();
    expect(await service.status('app2', 'g1')).toBe('none');
  });

  test('resolveAccessToken returns undefined with no row, a non-active status, or an expired token', async () => {
    const { service, setClock } = makeService();
    expect(await service.resolveAccessToken('app1', 'none')).toBeUndefined();
    await service.connect('app1', 'g2', 'u2', tokens('a', 'r', 10));
    setClock(1_000_000 + 20_000);
    expect(await service.resolveAccessToken('app1', 'g2')).toBeUndefined();
  });

  test('status reports none / active / revoked', async () => {
    const { service, store } = makeService();
    expect(await service.status('app1', 'none')).toBe('none');
    await service.connect('app1', 'g3', 'u3', tokens('a', 'r', 604800));
    expect(await service.status('app1', 'g3')).toBe('active');
    await store.setStatus('app1', 'g3', 'revoked');
    expect(await service.status('app1', 'g3')).toBe('revoked');
  });

  test('refreshDue refreshes a near-expiry token and stores the rotated refresh token', async () => {
    const { service, refresher, rows } = makeService();
    await service.connect('app1', 'g4', 'u4', tokens('old-access', 'old-refresh', 2));
    const result = await service.refreshDue();
    expect(result.refreshed).toBe(1);
    expect(refresher.refreshToken).toHaveBeenCalledWith('old-refresh');
    expect(await service.resolveAccessToken('app1', 'g4')).toBe('new-access');
    expect(rows.get('app1:g4')?.['status']).toBe('active');
  });

  test('refreshDue marks the guild revoked when Discord refuses the refresh', async () => {
    const { service, refresher } = makeService();
    await service.connect('app1', 'g5', 'u5', tokens('a', 'r', 2));
    refresher.refreshToken.mockRejectedValueOnce(new OAuth2RefreshError('nope', 401));
    const result = await service.refreshDue();
    expect(result.revoked).toBe(1);
    expect(await service.status('app1', 'g5')).toBe('revoked');
  });

  test('refreshDue marks revoked when the stored refresh token is unreadable', async () => {
    const { service, sealer } = makeService();
    await service.connect('app1', 'g7', 'u7', tokens('a', 'r', 2));
    sealer.read.mockImplementationOnce(async () => {
      throw new Error('gone');
    });
    const result = await service.refreshDue();
    expect(result.revoked).toBe(1);
    expect(await service.status('app1', 'g7')).toBe('revoked');
  });

  test('refreshDue skips a token that is not yet near expiry', async () => {
    const { service, refresher } = makeService();
    await service.connect('app1', 'g6', 'u6', tokens('a', 'r', 604800));
    const result = await service.refreshDue();
    expect(result).toEqual({ refreshed: 0, revoked: 0 });
    expect(refresher.refreshToken).not.toHaveBeenCalled();
  });

  test('adoptLegacy re-keys pre-change rows and reports the count', async () => {
    const { service, store, logger } = makeService();
    store.adoptLegacy.mockResolvedValueOnce(2);
    expect(await service.adoptLegacy('app1')).toBe(2);
    expect(logger.info).toHaveBeenCalledWith('command-permission-token-legacy-adopted', {
      applicationId: 'app1',
      count: 2,
    });
  });

  test('adoptLegacy is non-fatal: a failure is logged and yields zero', async () => {
    const { service, store, logger } = makeService();
    store.adoptLegacy.mockRejectedValueOnce(new Error('db down'));
    expect(await service.adoptLegacy('app1')).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      'command-permission-token-legacy-adopt-failed',
      expect.any(Object),
    );
  });
});

describe('listStoredApplications — who can hide a command instantly', () => {
  test('it names each application that holds a token, ONCE, and sorted', async () => {
    // The instant disable is a token per APPLICATION, so "can this profile do it?" is a question
    // about a specific application — not about one environment variable. Two guilds for one
    // application are still one answer.
    const { service } = makeService();
    await service.connect('app-b', 'g1', 'u1', tokens('a1', 'r1', 604800));
    await service.connect('app-a', 'g1', 'u1', tokens('a2', 'r2', 604800));
    await service.connect('app-b', 'g2', 'u1', tokens('a3', 'r3', 604800));
    expect(await service.listStoredApplications()).toEqual(['app-a', 'app-b']);
  });

  test('an empty store names nothing rather than inventing an answer', async () => {
    const { service } = makeService();
    expect(await service.listStoredApplications()).toEqual([]);
  });
});

// RT-20 — a healthy store must not behave like a missing one.
//
// The refresh cron runs every six hours, so an access token that expires between cycles used to leave
// resolveAccessToken answering nothing — and a disable then fell back exactly as if no authorization
// existed. `refreshIfExpired` refreshes once, at the point of use.
//
// Fixtures follow the file's own expiry pattern: `expiresIn: 10` against a clock advanced by 20s.
describe('resolveAccessToken is self-healing when asked (RT-20)', () => {
  test('an EXPIRED row is refreshed on demand and the fresh token returned', async () => {
    const { service, setClock, refresher } = makeService();
    await service.connect('app1', 'g1', 'u1', tokens('access-old', 'refresh-1', 10));

    // Live before expiry, absent after it — and absent is the state that used to be terminal.
    expect(await service.resolveAccessToken('app1', 'g1')).toBe('access-old');
    setClock(1_000_000 + 20_000);
    expect(await service.resolveAccessToken('app1', 'g1')).toBeUndefined();

    expect(await service.resolveAccessToken('app1', 'g1', { refreshIfExpired: true })).toBe(
      'new-access',
    );
    expect(refresher.refreshToken).toHaveBeenCalled();
  });

  test('without the flag it stays a pure read — no network, no refresh', async () => {
    const { service, setClock, refresher } = makeService();
    await service.connect('app1', 'g1', 'u1', tokens('access-old', 'refresh-1', 10));
    setClock(1_000_000 + 20_000);

    expect(await service.resolveAccessToken('app1', 'g1')).toBeUndefined();
    expect(refresher.refreshToken).not.toHaveBeenCalled();
  });

  test('an UNREADABLE credential is reported, not thrown (covers the read catch)', async () => {
    const { service, values } = makeService();
    await service.connect('app1', 'g1', 'u1', tokens('access-old', 'refresh-1', 10));
    // Drop the sealed access credential: the row still looks active, but the value is gone.
    values.delete('cred-1');

    expect(await service.resolveAccessToken('app1', 'g1')).toBeUndefined();
  });

  test('a FAILING refresh is contained, not propagated (covers the refresh catch)', async () => {
    const { service, store, setClock } = makeService();
    await service.connect('app1', 'g1', 'u1', tokens('access-old', 'refresh-1', 10));
    setClock(1_000_000 + 20_000);
    store.listRefreshable = async () => {
      throw new Error('database down');
    };

    // A disable must not fail because the refresh failed: it degrades to no Bearer.
    expect(
      await service.resolveAccessToken('app1', 'g1', { refreshIfExpired: true }),
    ).toBeUndefined();
  });

  test('a REVOKED row is not healed, and does not throw', async () => {
    // `refreshDue` only considers rows whose status is active, so a revoked grant is left revoked
    // rather than being retried on every disable.
    const { service, store, setClock, refresher } = makeService();
    await service.connect('app1', 'g1', 'u1', tokens('access-old', 'refresh-1', 10));
    await store.setStatus('app1', 'g1', 'revoked');
    setClock(1_000_000 + 20_000);

    expect(
      await service.resolveAccessToken('app1', 'g1', { refreshIfExpired: true }),
    ).toBeUndefined();
    expect(refresher.refreshToken).not.toHaveBeenCalled();
  });
});

// RT-24 — the branches the token work added or left bare. Coverage for branches sat at 64.98% against
// a 65% floor, which is a 0.02pp gap: this module's uncovered arms are cheap to reach, and each one is
// a real state rather than a synthetic path.
describe('the remaining token-store branches (RT-24)', () => {
  test('listStoredApplications reports each application once, sorted', async () => {
    const { service } = makeService();
    await service.connect('app-b', 'g1', 'u1', tokens('a', 'r', 604800));
    await service.connect('app-b', 'g2', 'u1', tokens('a', 'r', 604800));
    await service.connect('app-a', 'g1', 'u1', tokens('a', 'r', 604800));

    expect(await service.listStoredApplications()).toEqual(['app-a', 'app-b']);
  });

  test('a refresh that does not rotate the refresh token keeps the existing credential', async () => {
    const { service, store } = makeService({
      refresher: { refreshToken: async () => ({ accessToken: 'new-access', expiresIn: 604800 }) },
    });
    await service.connect('app1', 'g8', 'u1', tokens('access-old', 'refresh-1', 10));
    const before = (await store.findByApplicationGuild('app1', 'g8')).refreshCredentialId;

    expect((await service.refreshDue()).refreshed).toBe(1);
    expect((await store.findByApplicationGuild('app1', 'g8')).refreshCredentialId).toBe(before);
    expect(await service.resolveAccessToken('app1', 'g8')).toBe('new-access');
  });

  test('a non-revocation refresh failure marks the row expired, not revoked', async () => {
    const { service, store } = makeService({
      refresher: {
        refreshToken: async () => {
          throw new Error('network');
        },
      },
    });
    await service.connect('app1', 'g9', 'u1', tokens('access-old', 'refresh-1', 10));

    const result = await service.refreshDue();
    expect(result.revoked).toBe(0);
    expect(await store.findByApplicationGuild('app1', 'g9')).toMatchObject({ status: 'expired' });
  });
});
