export interface ComponentInteraction {
  customId: string;
  user: { id: string };
  guildId: string | null;
  reply: (options: unknown) => Promise<void>;
  deferReply: (options?: { ephemeral?: boolean }) => Promise<void>;
  editReply: (options: unknown) => Promise<void>;
}

export interface IComponentHandler {
  customIdPrefix: string;
  parse(customId: string): unknown;
  execute(interaction: ComponentInteraction, context: unknown): Promise<void>;
}

export class InteractionRegistry {
  private readonly handlers = new Map<string, IComponentHandler>();

  register(handler: IComponentHandler): void {
    this.handlers.set(handler.customIdPrefix, handler);
  }

  resolve(customId: string): IComponentHandler | undefined {
    for (const [prefix, handler] of this.handlers) {
      if (customId.startsWith(prefix)) return handler;
    }
    return undefined;
  }

  async dispatch(interaction: ComponentInteraction): Promise<boolean> {
    const handler = this.resolve(interaction.customId);
    if (!handler) return false;

    const context = handler.parse(interaction.customId);
    await handler.execute(interaction, context);
    return true;
  }

  has(customId: string): boolean {
    return this.resolve(customId) !== undefined;
  }

  all(): IComponentHandler[] {
    return [...this.handlers.values()];
  }
}
