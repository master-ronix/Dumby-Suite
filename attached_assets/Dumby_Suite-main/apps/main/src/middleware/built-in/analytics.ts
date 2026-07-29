/**
 * Priority 90: AnalyticsMiddleware (Cluster: Ring).
 * Records invocation start for MTP (Metric Track Protocol) metering.
 * Never aborts.
 */
import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import type { Logger } from '../../logging/logger.js';

export class AnalyticsMiddleware implements Middleware {
  readonly priority = 90;

  constructor(private readonly logger: Logger) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    const start = Date.now();
    ctx.meta['invocationStart'] = start;
    try {
      await next();
    } finally {
      this.logger.info('command-invocation', {
        command: ctx.commandName,
        userId: ctx.userId,
        guildId: ctx.guildId ?? 'DM',
        ...(ctx.correlationId !== null ? { correlationId: ctx.correlationId } : {}),
        durationMs: Date.now() - start,
      });
    }
  }
}
