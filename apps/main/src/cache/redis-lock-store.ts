import type { Redis } from 'ioredis';

export interface LockStore {
  setNX(key: string, owner: string, ttlMs: number): Promise<boolean>;

  /** Extend the TTL of a lock already held by `owner`; false if the key is gone or not ours. */
  refresh(key: string, owner: string, ttlMs: number): Promise<boolean>;

  release(key: string, owner: string): Promise<void>;
}

export class RedisLockStore implements LockStore {
  private static readonly RELEASE_SCRIPT = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  private static readonly REFRESH_SCRIPT = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("PEXPIRE", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  constructor(private readonly redis: Redis) {}

  async setNX(key: string, owner: string, ttlMs: number): Promise<boolean> {
    const result = await this.redis.set(key, owner, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async refresh(key: string, owner: string, ttlMs: number): Promise<boolean> {
    const result = await this.redis.eval(RedisLockStore.REFRESH_SCRIPT, 1, key, owner, ttlMs);
    return result === 1;
  }

  async release(key: string, owner: string): Promise<void> {
    await this.redis.eval(RedisLockStore.RELEASE_SCRIPT, 1, key, owner);
  }
}

interface MemEntry {
  owner: string;
  expiresAt: number;
}

export class InMemoryLockStore implements LockStore {
  private readonly locks = new Map<string, MemEntry>();
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  async setNX(key: string, owner: string, ttlMs: number): Promise<boolean> {
    const existing = this.locks.get(key);
    if (existing && this.now() < existing.expiresAt) {
      return false;
    }
    this.locks.set(key, { owner, expiresAt: this.now() + ttlMs });
    return true;
  }

  async refresh(key: string, owner: string, ttlMs: number): Promise<boolean> {
    const existing = this.locks.get(key);
    if (!existing || existing.owner !== owner || this.now() >= existing.expiresAt) {
      return false;
    }
    existing.expiresAt = this.now() + ttlMs;
    return true;
  }

  async release(key: string, owner: string): Promise<void> {
    const existing = this.locks.get(key);
    if (existing && existing.owner === owner) {
      this.locks.delete(key);
    }
  }
}
