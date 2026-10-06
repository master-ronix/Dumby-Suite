import { test, expect, vi } from 'vitest';
import {
  shardLockKey,
  parseShardRange,
  ShardOwnershipManager,
} from '../../src/discord/shard-ownership.js';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as never;

function makeStore() {
  return {
    setNX: vi.fn(),
    refresh: vi.fn(),
    release: vi.fn(),
  };
}

test('shardLockKey builds the ownership key', () => {
  expect(shardLockKey(3)).toBe('shard:3:owner');
});

test('parseShardRange parses and validates ranges', () => {
  expect(parseShardRange('0-2')).toStrictEqual([0, 1, 2]);
  expect(parseShardRange(' 4-4 ')).toStrictEqual([4]);
  expect(() => parseShardRange('bad')).toThrow(RangeError);
  expect(() => parseShardRange('5-2')).toThrow(RangeError);
});

test('claim acquires shards, retrying while the lock is held', async () => {
  const store = makeStore();
  store.setNX.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const mgr = new ShardOwnershipManager({
    lockStore: store as never,
    logger,
    ownerId: 'pod-1',
    heartbeatMs: 1000,
    retryMs: 1,
    sleep: async () => {},
  });
  const got = await mgr.claim([0], 2);
  expect(got).toStrictEqual([0]);
  expect(mgr.ownedShards()).toStrictEqual([0]);
});

test('claim gives up after maxAttempts', async () => {
  const store = makeStore();
  store.setNX.mockResolvedValue(false);
  const mgr = new ShardOwnershipManager({
    lockStore: store as never,
    logger,
    ownerId: 'pod-1',
    heartbeatMs: 1000,
    retryMs: 1,
    sleep: async () => {},
  });
  const got = await mgr.claim([0], 2);
  expect(got).toStrictEqual([]);
  expect(mgr.ownedShards()).toStrictEqual([]);
});

test('releaseAll releases every held shard', async () => {
  const store = makeStore();
  store.setNX.mockResolvedValue(true);
  store.release.mockResolvedValue(undefined);
  const mgr = new ShardOwnershipManager({
    lockStore: store as never,
    logger,
    ownerId: 'pod-1',
    heartbeatMs: 1000,
    retryMs: 1,
    sleep: async () => {},
  });
  await mgr.claim([0, 1]);
  expect(mgr.ownedShards().sort()).toStrictEqual([0, 1]);
  await mgr.releaseAll();
  expect(store.release).toHaveBeenCalledTimes(2);
  expect(mgr.ownedShards()).toStrictEqual([]);
});

test('heartbeat drops a shard whose lock is lost', async () => {
  const store = makeStore();
  store.setNX.mockResolvedValue(true);
  store.refresh.mockResolvedValue(false);
  let scheduled: (() => void) | null = null;
  const mgr = new ShardOwnershipManager({
    lockStore: store as never,
    logger,
    ownerId: 'pod-1',
    heartbeatMs: 1000,
    retryMs: 1,
    sleep: async () => {},
    schedule: (fn) => {
      scheduled = fn;
      return 1;
    },
    cancel: () => {},
  });
  await mgr.claim([0, 1]);
  mgr.startHeartbeat();
  mgr.startHeartbeat(); // second call is a no-op
  scheduled?.();
  await new Promise((r) => setImmediate(r));
  expect(mgr.ownedShards()).toStrictEqual([]);
  mgr.stopHeartbeat();
});
