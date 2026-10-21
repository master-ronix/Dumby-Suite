import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { ShardOwnershipManager, claimShardsWithin } from '../../src/discord/shard-ownership.js';

/**
 * §23.2 — a shard claim must never be able to block the boot.
 *
 * `claim()` retries until it owns the shard or its attempts run out, and BOTH outcomes require Redis
 * to answer. With an unreachable lock store, ioredis holds the command in its offline queue and the
 * promise never settles: the boot stalls before the gateway login, the API server never binds its
 * port, and the platform kills the deploy with "failed to detect open port". That is what happened on
 * Render — eight modules seeded, then `shard-ownership-claiming` and fourteen minutes of silence.
 */
function makeLogger() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

describe('claimShardsWithin', () => {
  test('returns the claimed shards when the lock store answers', async () => {
    const logger = makeLogger();
    const manager = new ShardOwnershipManager({
      lockStore: { setNX: async () => true, refresh: async () => true, release: async () => {} },
      logger,
      ownerId: 'pod-1',
      heartbeatMs: 10_000,
      retryMs: 1,
    });

    await expect(claimShardsWithin(manager, [0], logger, 500)).resolves.toStrictEqual([0]);
  });

  test('resolves empty and warns when the lock store never answers', async () => {
    const logger = makeLogger();
    const manager = new ShardOwnershipManager({
      // A lock store that never settles — the offline-queue behaviour of a disconnected Redis.
      lockStore: {
        setNX: () => new Promise<boolean>(() => {}),
        refresh: async () => true,
        release: async () => {},
      },
      logger,
      ownerId: 'pod-1',
      heartbeatMs: 10_000,
      retryMs: 1,
    });

    // The deadline is what saves the boot: without it this would hang forever.
    await expect(claimShardsWithin(manager, [0], logger, 40)).resolves.toStrictEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      'shard-claim-deadline-exceeded',
      expect.objectContaining({ shards: [0] }),
    );
  });
});
