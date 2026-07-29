/**
 * Priority 30: LocaleMiddleware (Cluster: Ring).
 * Binds the resolved locale to the context meta. Never aborts.
 */
import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';

export interface LocaleResolver {
  resolve(guildId: string | null, userId: string): string;
}

export class LocaleMiddleware implements Middleware {
  readonly priority = 30;

  constructor(private readonly resolver: LocaleResolver) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    ctx.meta['locale'] = this.resolver.resolve(ctx.guildId, ctx.userId);
    await next();
  }
}

export class DefaultLocaleResolver implements LocaleResolver {
  constructor(private readonly defaultLocale: string = 'en-US') {}
  resolve(_guildId: string | null, _userId: string): string {
    return this.defaultLocale;
  }
}
