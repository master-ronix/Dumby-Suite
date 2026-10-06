import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import { MiddlewareRejectError } from '../base-middleware.js';

export interface CommandMetaSource {
  isGuildOnly(commandName: string): boolean;
}

export class AuthMiddleware implements Middleware {
  readonly priority = 10;

  constructor(private readonly meta: CommandMetaSource) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    const isDM = ctx.guildId === null;
    if (isDM && this.meta.isGuildOnly(ctx.commandName)) {
      throw new MiddlewareRejectError(400, 'This command can only be used in a server', false);
    }
    await next();
  }
}
