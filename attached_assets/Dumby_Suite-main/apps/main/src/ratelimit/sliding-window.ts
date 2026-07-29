/**
 * Rate limiting (Cluster: Mash). Sliding-window-log algorithm:
 * exact (no fixed-window edge-burst problem), and rejected attempts are
 * NOT recorded — a client hammering the endpoint while blocked does not
 * get to "buy" a later window by spending attempts during the block.
 *
 * Defaults mirror RATE_LIMIT_USER_MAX / RATE_LIMIT_USER_WINDOW_MS and the
 * guild-scoped equivalents from .env.example.
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {
    if (maxHits < 1) throw new RangeError('maxHits must be >= 1');
    if (windowMs < 1) throw new RangeError('windowMs must be >= 1');
  }

  checkAndIncrement(key: string): RateLimitDecision {
    const now = this.now();
    const windowStart = now - this.windowMs;
    const existing = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (existing.length >= this.maxHits) {
      this.hits.set(key, existing);
      const oldest = existing[0] ?? now;
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, oldest + this.windowMs - now) };
    }

    existing.push(now);
    this.hits.set(key, existing);
    return { allowed: true, remaining: this.maxHits - existing.length, retryAfterMs: 0 };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  clear(): void {
    this.hits.clear();
  }
}

export interface AsyncRateLimiter {
  checkAndIncrement(key: string): Promise<RateLimitDecision>;
}

/**
 * Wraps a primary (Redis-backed) limiter; if it throws (Redis outage), falls
 * back to an in-process SlidingWindowRateLimiter and fires onFallbackEngaged
 * exactly once per transition so a metric/log can be emitted without
 * spamming on every request while the outage persists.
 */
export class FallbackRateLimiter implements AsyncRateLimiter {
  private usingFallback = false;

  constructor(
    private readonly primary: AsyncRateLimiter,
    private readonly fallback: SlidingWindowRateLimiter,
    private readonly onFallbackEngaged: () => void,
    private readonly onFallbackRecovered?: () => void,
  ) {}

  async checkAndIncrement(key: string): Promise<RateLimitDecision> {
    try {
      const result = await this.primary.checkAndIncrement(key);
      if (this.usingFallback) {
        this.usingFallback = false;
        this.onFallbackRecovered?.();
      }
      return result;
    } catch {
      if (!this.usingFallback) {
        this.usingFallback = true;
        this.onFallbackEngaged();
      }
      return this.fallback.checkAndIncrement(key);
    }
  }

  isUsingFallback(): boolean {
    return this.usingFallback;
  }
}
