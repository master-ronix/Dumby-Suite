/**
 * Lock store implementations for StampedeGuard.
 *
 * Blueprint §25 / directive Rule 26.3: stampede protection uses a distributed
 * lock (SET NX EX) on a true miss. The lock store is the narrow interface that
 * StampedeGuard calls; there are two implementations:
 *
 *   • RedisLockStore — production path, wraps ioredis.
 *   • InMemoryLockStore — test / Redis-outage fallback path. Used directly
 *     by unit tests (stampede-guard.test.ts) and as the fallback when Redis
 *     is unavailable during rate-limit operations.
 */

import type { Redis } from 'ioredis';

/** Narrow interface that StampedeGuard depends on. */
export interface LockStore {
  /**
   * SET key owner NX PX ttlMs — returns true if the lock was acquired,
   * false if it was already held.
   */
  setNX(key: string, owner: string, ttlMs: number): Promise<boolean>;

  /**
   * Release the lock if and only if this process still owns it (compare-and-delete).
   * A non-owner calling release MUST be a no-op — never releases another owner's lock.
   */
  release(key: string, owner: string): Promise<void>;
}

// ── Redis implementation ───────────────────────────────────────────────────

/**
 * Production lock store backed by Redis. Uses SET NX PX for atomic
 * acquisition and a Lua CAS script for safe release.
 */
export class RedisLockStore implements LockStore {
  /** Lua script: release only if the key still holds our token. */
  private static readonly RELEASE_SCRIPT = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  constructor(private readonly redis: Redis) {}

  async setNX(key: string, owner: string, ttlMs: number): Promise<boolean> {
    const result = await this.redis.set(key, owner, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async release(key: string, owner: string): Promise<void> {
    await this.redis.eval(RedisLockStore.RELEASE_SCRIPT, 1, key, owner);
  }
}

// ── In-memory implementation ──────────────────────────────────────────────

interface MemEntry {
  owner: string;
  expiresAt: number;
}

/**
 * In-memory lock store for unit tests and for the Redis-outage fallback
 * inside RateLimitMiddleware. Accepts an optional `now` supplier for
 * deterministic time-travel in tests (stampede-guard.test.ts).
 */
export class InMemoryLockStore implements LockStore {
  private readonly locks = new Map<string, MemEntry>();
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  async setNX(key: string, owner: string, ttlMs: number): Promise<boolean> {
    const existing = this.locks.get(key);
    if (existing && this.now() < existing.expiresAt) {
      return false; // lock is held by someone else
    }
    this.locks.set(key, { owner, expiresAt: this.now() + ttlMs });
    return true;
  }

  async release(key: string, owner: string): Promise<void> {
    const existing = this.locks.get(key);
    // Compare-and-delete: only the lock owner may release.
    if (existing && existing.owner === owner) {
      this.locks.delete(key);
    }
  }
}
