import { test, expect, vi } from 'vitest';
import { DbBlacklistLookup } from '../../src/permissions/db-blacklist.js';

test('exact matches are served from the loaded snapshot', async () => {
  const lookup = new DbBlacklistLookup({
    loader: async () => [
      { userId: '100', guildId: null },
      { userId: '200', guildId: 'g1' },
    ],
  });
  await lookup.prime();

  expect(lookup.isGloballyBlacklisted('100')).toBe(true);
  expect(lookup.isGloballyBlacklisted('999')).toBe(false);
  expect(lookup.isGuildBlacklisted('200', 'g1')).toBe(true);
  expect(lookup.isGuildBlacklisted('200', 'g2')).toBe(false);
  expect(lookup.isGuildBlacklisted('100', 'g1')).toBe(false);
});

test('unloaded snapshot answers nothing (fail open unless the DB says otherwise)', async () => {
  const lookup = new DbBlacklistLookup({ loader: async () => [] });
  expect(lookup.isGloballyBlacklisted('100')).toBe(false);
  expect(lookup.isGuildBlacklisted('100', 'g1')).toBe(false);
});

test('refreshIfStale reloads once the TTL elapses but not before', async () => {
  const loader = vi
    .fn<() => Promise<Array<{ userId: string; guildId: string | null }>>>()
    .mockResolvedValue([{ userId: '100', guildId: null }]);
  const lookup = new DbBlacklistLookup({ loader, ttlMs: 1_000_000 });

  await lookup.prime();
  expect(loader).toHaveBeenCalledTimes(1);

  // Within TTL: no reload.
  await lookup.refreshIfStale();
  expect(loader).toHaveBeenCalledTimes(1);

  // Past TTL: reload happens.
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 5_000_000);
  await lookup.refreshIfStale();
  expect(loader).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});

test('a single concurrent refresh is shared across callers', async () => {
  let resolveLoad: (rows: Array<{ userId: string; guildId: string | null }>) => void = () => {};
  let calls = 0;
  const lookup = new DbBlacklistLookup({
    ttlMs: 1_000,
    loader: () => {
      calls += 1;
      return new Promise((resolve) => {
        resolveLoad = resolve;
      });
    },
  });

  const first = lookup.refreshIfStale();
  const second = lookup.refreshIfStale();
  resolveLoad([{ userId: '1', guildId: null }]);
  await Promise.all([first, second]);

  expect(calls).toBe(1);
  expect(lookup.isGloballyBlacklisted('1')).toBe(true);
});
