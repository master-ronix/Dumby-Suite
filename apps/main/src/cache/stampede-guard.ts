/**
 * StampedeGuard — wraps a recompute function with a distributed lock so
 * only one caller rebuilds the value on a cache miss; all other concurrent
 * callers are told the lock is held and may serve a stale value instead.
 *
 * Blueprint §25: stampede protection is a distributed lock (SET NX EX) on
 * a true miss. The guard returns `{ acquired: true, result }` to the winner
 * and `{ acquired: false }` to all losers — the caller decides whether to
 * wait, serve stale, or omit the field.
 */

import type { LockStore } from './redis-lock-store.js';

export type StampedeOutcome<T> = { acquired: true; result: T } | { acquired: false };

export class StampedeGuard {
  private static readonly DEFAULT_LOCK_TTL_MS = 30_000;

  constructor(private readonly store: LockStore) {}

  /**
   * Attempt to acquire the lock for `key`, run `recompute()`, then release.
   * Returns `{ acquired: false }` immediately if the lock is already held.
   * The lock is released even if `recompute` throws.
   */
  async withLock<T>(
    key: string,
    owner: string,
    recompute: () => Promise<T>,
    lockTtlMs = StampedeGuard.DEFAULT_LOCK_TTL_MS,
  ): Promise<StampedeOutcome<T>> {
    const acquired = await this.store.setNX(key, owner, lockTtlMs);
    if (!acquired) return { acquired: false };

    try {
      const result = await recompute();
      return { acquired: true, result };
    } finally {
      await this.store.release(key, owner);
    }
  }
}
