import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import { MiddlewareRejectError } from '../base-middleware.js';

export interface DiscordPermissionChecker {
  getMemberPermissions(userId: string, guildId: string): Promise<readonly string[]>;
  getRequiredPermissions(commandName: string): readonly string[];
}

export class PermissionMiddleware implements Middleware {
  readonly priority = 50;

  constructor(private readonly checker: DiscordPermissionChecker) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    if (!ctx.guildId) {
      await next();
      return;
    }

    const required = this.checker.getRequiredPermissions(ctx.commandName);
    if (required.length === 0) {
      await next();
      return;
    }

    const member = await this.checker.getMemberPermissions(ctx.userId, ctx.guildId);
    const missing = required.filter((p) => !member.includes(p));
    if (missing.length > 0) {
      throw new MiddlewareRejectError(403, `Missing permissions: ${missing.join(', ')}`, false);
    }

    await next();
  }
}
