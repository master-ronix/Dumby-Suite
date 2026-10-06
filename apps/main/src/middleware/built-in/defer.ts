/**
 * Priority 80: DeferMiddleware (Cluster: Ring).
 * Calls deferReply() on the interaction if the command declares requiresDefer.
 * The health and hello commands do NOT defer (they resolve in <3s).
 * Never aborts.
 */
import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';

export interface DeferConfig {
  requiresDefer(commandName: string): boolean;
  isEphemeral(commandName: string): boolean;
}

export class DeferMiddleware implements Middleware {
  readonly priority = 80;

  constructor(private readonly config: DeferConfig) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    const interaction = ctx.meta['interaction'] as
      { deferReply?: (opts?: { ephemeral?: boolean }) => Promise<void> } | undefined;

    if (interaction?.deferReply && this.config.requiresDefer(ctx.commandName)) {
      await interaction.deferReply({ ephemeral: this.config.isEphemeral(ctx.commandName) });
      ctx.meta['deferred'] = true;
    }

    await next();
  }
}
