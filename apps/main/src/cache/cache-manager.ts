import { L1Cache } from './l1-cache.js';
import { StampedeGuard } from './stampede-guard.js';
import { RedisLockStore, type LockStore } from './redis-lock-store.js';
import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { Logger } from '../logging/logger.js';

const NEGATIVE_SENTINEL = '__DUMBY_CACHE_NULL__';

export interface CacheManagerOptions {
  redis: Redis;
  lockStore?: LockStore;
  logger: Logger;
  l1MaxEntries?: number;
  l1MaxBytes?: number;
  defaultTtlMs?: number;
  negativeTtlMs?: number;
}

export class CacheManager {
  private readonly l1: L1Cache;
  private readonly redis: Redis;
  private readonly guard: StampedeGuard;
  private readonly logger: Logger;
  private readonly defaultTtlMs: number;
  private readonly negativeTtlMs: number;

  constructor(options: CacheManagerOptions) {
    this.redis = options.redis;
    this.logger = options.logger;
    this.defaultTtlMs = options.defaultTtlMs ?? 5 * 60 * 1_000;
    this.negativeTtlMs = options.negativeTtlMs ?? 30_000;

    this.l1 = new L1Cache({
      maxEntries: options.l1MaxEntries ?? 5_000,
      maxBytes: options.l1MaxBytes ?? 50 * 1024 * 1024,
    });

    const lockStore = options.lockStore ?? new RedisLockStore(this.redis);
    this.guard = new StampedeGuard(lockStore);
  }

  async get<T>(
    key: string,
    recompute: () => Promise<T | null | undefined>,
    options?: { ttlMs?: number; negativeTtlMs?: number },
  ): Promise<T | null> {
    const l1Hit = this.l1.get(key);
    if (l1Hit !== undefined) {
      if (l1Hit === NEGATIVE_SENTINEL) return null;
      return l1Hit as T;
    }

    try {
      const l2Raw = await this.redis.get(key);
      if (l2Raw !== null) {
        if (l2Raw === NEGATIVE_SENTINEL) {
          this.l1.set(
            key,
            NEGATIVE_SENTINEL as unknown,
            options?.negativeTtlMs ?? this.negativeTtlMs,
          );
          return null;
        }
        const parsed = JSON.parse(l2Raw) as T;
        this.l1.set(key, parsed as unknown, options?.ttlMs ?? this.defaultTtlMs);
        return parsed;
      }
    } catch (err) {
      this.logger.warn('cache-l2-read-error', { key, err });
    }

    const owner = randomUUID();
    const outcome = await this.guard.withLock(`lock:${key}`, owner, async () => {
      const value = await recompute();
      const ttlMs = options?.ttlMs ?? this.defaultTtlMs;
      const negTtlMs = options?.negativeTtlMs ?? this.negativeTtlMs;

      if (value === undefined || value === null) {
        try {
          await this.redis.set(key, NEGATIVE_SENTINEL, 'PX', negTtlMs);
        } catch (err) {
          this.logger.warn('cache-l2-write-error', { key, err });
        }
        this.l1.set(key, NEGATIVE_SENTINEL as unknown, negTtlMs);
        return null;
      }

      const serialized = JSON.stringify(value);
      try {
        await this.redis.set(key, serialized, 'PX', ttlMs);
      } catch (err) {
        this.logger.warn('cache-l2-write-error', { key, err });
      }
      this.l1.set(key, value as unknown, ttlMs);
      return value;
    });

    if (outcome.acquired) return outcome.result as T | null;

    try {
      const fallback = await this.redis.get(key);
      if (fallback !== null) {
        if (fallback === NEGATIVE_SENTINEL) return null;
        return JSON.parse(fallback) as T;
      }
    } catch {}

    const direct = await recompute();
    return (direct ?? null) as T | null;
  }

  async invalidate(key: string): Promise<void> {
    this.l1.delete(key);
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn('cache-l2-invalidate-error', { key, err });
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    this.l1.set(key, value as unknown, effectiveTtl);
    try {
      await this.redis.set(key, JSON.stringify(value), 'PX', effectiveTtl);
    } catch (err) {
      this.logger.warn('cache-l2-set-error', { key, err });
    }
  }

  async flushNamespace(prefix: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`${prefix}*`);
      if (keys.length > 0) await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn('cache-namespace-flush-error', { prefix, err });
    }
  }

  get l1Stats(): { size: number } {
    return { size: this.l1.size() };
  }
}
