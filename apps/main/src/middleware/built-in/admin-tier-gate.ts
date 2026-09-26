import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import { MiddlewareRejectError } from '../base-middleware.js';
import type { Logger } from '../../logging/logger.js';

export interface AdminTierGateConfig {
  botOwnerIds: readonly string[];
  isAdminTierCommand(commandName: string): boolean;
}

export class AdminTierGateMiddleware implements Middleware {
  readonly priority = -10;

  constructor(
    private readonly config: AdminTierGateConfig,
    private readonly logger: Logger,
  ) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    if (
      this.config.isAdminTierCommand(ctx.commandName) &&
      !this.config.botOwnerIds.includes(ctx.userId)
    ) {
      this.logger.warn('admin-tier-gate-reject', {
        command: ctx.commandName,
        userId: ctx.userId,
        guildId: ctx.guildId ?? 'DM',
      });
      throw new MiddlewareRejectError(403, 'Admin-tier command denied', true);
    }
    await next();
  }
}
