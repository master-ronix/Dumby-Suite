import { describe, expect, test, vi } from 'vitest';
import {
  ShardOwnershipManager,
  parseShardRange,
  shardLockKey,
} from '../../src/discord/shard-ownership.js';
import { InMemoryLockStore } from '../../src/cache/redis-lock-store.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * §23.2 / §26.4 — exactly one process holds the live gateway connection per shard, arbitrated by a
 * `shard:{shardId}:owner` Redis lock. `SHARD_RANGE`, `SHARD_LOCK_HEARTBEAT_MS` and
 * `SHARD_LOCK_RETRY_MS` were declared and read by no code; this is the protocol that uses them.
 */
const logger = createLogger('error');

const makeManager = (
  lockStore: InMemoryLockStore,
  ownerId: string,
  overrides: Partial<ConstructorParameters<typeof ShardOwnershipManager>[0]> = {},
) =>
  new ShardOwnershipManager({
    lockStore,
    logger,
    ownerId,
    heartbeatMs: 1000,
    retryMs: 1,
    sleep: async () => {},
    ...overrides,
  });

describe('M9 env keys — shard ownership (§23.2)', () => {
  test('parseShardRange maps a contiguous range to shard IDs', () => {
    expect(parseShardRange('0-5')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(parseShardRange('3-3')).toEqual([3]);
    expect(parseShardRange(' 7-9 ')).toEqual([7, 8, 9]);
    expect(() => parseShardRange('nonsense')).toThrow(RangeError);
    expect(() => parseShardRange('5-2')).toThrow(RangeError);
  });

  test('a free shard is claimed and keyed shard:{id}:owner', async () => {
    expect(shardLockKey(4)).toBe('shard:4:owner');
    const lockStore = new InMemoryLockStore();
    const manager = makeManager(lockStore, 'pod-a');
    expect(await manager.claim([0, 1])).toEqual([0, 1]);
    expect(manager.ownedShards()).toEqual([0, 1]);
  });

  test('a shard already owned elsewhere is not claimed', async () => {
    const lockStore = new InMemoryLockStore();
    await makeManager(lockStore, 'pod-a').claim([0]);

    const second = makeManager(lockStore, 'pod-b');
    expect(await second.claim([0], 1)).toEqual([]);
    expect(second.ownedShards()).toEqual([]);
  });

  test('a non-owner retries until the lock is released, then claims it', async () => {
    const lockStore = new InMemoryLockStore();
    const first = makeManager(lockStore, 'pod-a');
    await first.claim([0]);

    const second = makeManager(lockStore, 'pod-b');
    let attempts = 0;
    const manager = makeManager(lockStore, 'pod-b', {
      sleep: async () => {
        attempts += 1;
        await first.releaseAll();
      },
    });
    expect(await manager.claim([0], 5)).toEqual([0]);
    expect(attempts).toBe(1);
    expect(second.ownedShards()).toEqual([]);
  });

  test('the heartbeat refreshes every held lock, and release frees it', async () => {
    const lockStore = new InMemoryLockStore();
    const refresh = vi.spyOn(lockStore, 'refresh');
    const scheduled: Array<() => void> = [];
    const manager = makeManager(lockStore, 'pod-a', {
      schedule: (fn) => {
        scheduled.push(fn);
        return 1;
      },
      cancel: () => {},
    });

    await manager.claim([0]);
    manager.startHeartbeat();
    expect(scheduled).toHaveLength(1);
    scheduled[0]!();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(refresh).toHaveBeenCalledWith('shard:0:owner', 'pod-a', 1000);

    await manager.releaseAll();
    expect(manager.ownedShards()).toEqual([]);
    expect(await makeManager(lockStore, 'pod-b').claim([0])).toEqual([0]);
  });
});
