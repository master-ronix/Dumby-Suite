import { randomUUID } from 'node:crypto';
import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';

export class TraceMiddleware implements Middleware {
  readonly priority = 0;

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    ctx.correlationId = randomUUID();
    ctx.meta['traceStart'] = Date.now();
    await next();
  }
}
