import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import type { Logger } from '../../logging/logger.js';

export interface GuildConfigLoader {
  load(guildId: string): Promise<Record<string, unknown>>;
}

export class GuildConfigMiddleware implements Middleware {
  readonly priority = 20;

  constructor(
    private readonly loader: GuildConfigLoader,
    private readonly logger: Logger,
  ) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    if (ctx.guildId) {
      try {
        ctx.meta['guildConfig'] = await this.loader.load(ctx.guildId);
      } catch (err) {
        this.logger.warn('guild-config-load-failed', {
          guildId: ctx.guildId,
          error: String(err),
          note: 'degrading to defaults',
        });
        ctx.meta['guildConfig'] = {};
      }
    }
    await next();
  }
}
