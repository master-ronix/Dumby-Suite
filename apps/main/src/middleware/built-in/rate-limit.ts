/**
 * Priority 40: RateLimitMiddleware (Cluster: Ring).
 * Dual-window sliding check (per-user + per-guild).
 * Falls back to in-memory when Redis is unavailable — fail-closed.
 */
import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import { MiddlewareRejectError } from '../base-middleware.js';
import type { SlidingWindowRateLimiter } from '../../ratelimit/sliding-window.js';

export interface RateLimitConfig {
  userMax: number;
  userWindowMs: number;
  guildMax: number;
  guildWindowMs: number;
}

export class RateLimitMiddleware implements Middleware {
  readonly priority = 40;

  constructor(
    private readonly limiter: SlidingWindowRateLimiter,
    private readonly config: RateLimitConfig,
  ) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    const userKey = `ratelimit:user:${ctx.userId}:${ctx.commandName}`;
    const userResult = await this.limiter.checkAndIncrement(userKey);
    if (!userResult.allowed) {
      throw new MiddlewareRejectError(429, `Rate limit exceeded. Try again in ${Math.ceil(userResult.retryAfterMs / 1000)}s`, false);
    }

    if (ctx.guildId) {
      const guildKey = `ratelimit:guild:${ctx.guildId}:${ctx.commandName}`;
      const guildResult = await this.limiter.checkAndIncrement(guildKey);
      if (!guildResult.allowed) {
        throw new MiddlewareRejectError(429, `Server rate limit exceeded. Try again in ${Math.ceil(guildResult.retryAfterMs / 1000)}s`, false);
      }
    }

    await next();
  }
}
