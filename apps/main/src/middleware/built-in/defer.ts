import { MessageFlags } from 'discord.js';
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
      { deferReply?: (opts?: { flags?: number | bigint }) => Promise<void> } | undefined;

    if (interaction?.deferReply && this.config.requiresDefer(ctx.commandName)) {
      // `ephemeral` on the defer options is deprecated in discord.js; use the `Ephemeral` flag.
      // (`exactOptionalPropertyTypes` forbids `flags: undefined`, so the option is omitted instead.)
      await interaction.deferReply(
        this.config.isEphemeral(ctx.commandName) ? { flags: MessageFlags.Ephemeral } : undefined,
      );
      ctx.meta['deferred'] = true;
    }

    await next();
  }
}
