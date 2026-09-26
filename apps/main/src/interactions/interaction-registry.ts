export interface ComponentInteraction {
  id?: string;
  customId: string;
  user: { id: string };
  guildId: string | null;
  reply: (options: unknown) => Promise<void>;
  deferReply: (options?: { ephemeral?: boolean }) => Promise<void>;
  deferUpdate?: () => Promise<void>;
  editReply: (options: unknown) => Promise<void>;
}

export interface IComponentHandler {
  customIdPrefix: string;
  parse(customId: string): unknown;
  idempotencyKey?: (interaction: ComponentInteraction, context: unknown) => string;
  execute(interaction: ComponentInteraction, context: unknown): Promise<void>;
}

export interface MintCustomIdInput {
  moduleNamespace: string;
  handlerKey: string;
  invokerId: string;
  contextPayload: string;
}

export interface InteractionRegistryOptions {
  /**
   * Applied to the navigation message in place once an interaction passes the
   * invoker re-check, so the buffer lifecycle (§20.8/§20.9) acknowledges even
   * component interactions. Defaults to no-op; the live wiring binds this to a
   * renderer-issued buffer edit / deferUpdate.
   */
  acknowledge?: (interaction: ComponentInteraction) => Promise<void>;
}

const CUSTOM_ID_SEPARATOR = ':';
const CUSTOM_ID_MAX_LENGTH = 100;
export const AUTOCOMPLETE_BUDGET_MS = 800;

export class InteractionRegistry {
  private readonly handlers = new Map<string, IComponentHandler>();
  private readonly inFlight = new Map<string, Promise<boolean>>();
  private readonly completed = new Set<string>();
  private readonly acknowledge: ((interaction: ComponentInteraction) => Promise<void>) | undefined;

  constructor(options: InteractionRegistryOptions = {}) {
    this.acknowledge = options.acknowledge;
  }

  register(handler: IComponentHandler): void {
    this.handlers.set(handler.customIdPrefix, handler);
  }

  mintCustomId(input: MintCustomIdInput): string {
    const customId = [
      input.moduleNamespace,
      input.handlerKey,
      input.invokerId,
      input.contextPayload,
    ].join(CUSTOM_ID_SEPARATOR);
    if (customId.length > CUSTOM_ID_MAX_LENGTH) {
      throw new RangeError('Minted customId exceeds Discord custom_id length limit');
    }
    return customId;
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
    if (!this.invokerMatches(interaction)) return true;

    const key =
      handler.idempotencyKey?.(interaction, context) ?? interaction.id ?? interaction.customId;
    if (this.completed.has(key)) return true;

    if (this.acknowledge !== undefined) {
      await this.acknowledge(interaction);
    }

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const pending = handler
      .execute(interaction, context)
      .then(() => {
        this.completed.add(key);
        return true;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, pending);
    return pending;
  }

  has(customId: string): boolean {
    return this.resolve(customId) !== undefined;
  }

  all(): IComponentHandler[] {
    return [...this.handlers.values()];
  }

  async runAutocomplete<T>(
    handler: () => Promise<readonly T[]>,
    fallback: readonly T[] = [],
    budgetMs = AUTOCOMPLETE_BUDGET_MS,
  ): Promise<readonly T[]> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        handler(),
        new Promise<readonly T[]>((resolve) => {
          timer = setTimeout(() => resolve(fallback), budgetMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Registry-minted customIds carry a 4-segment shape
   * `{namespace}:{handler}:{invoker}:{context}`; the third segment binds the
   * interaction to its invoker and is compared here on every dispatch. A
   * customId without an invoker binding segment routes prefix-based without the
   * re-check (blueprint.md §20.1).
   */
  private invokerMatches(interaction: ComponentInteraction): boolean {
    const parts = interaction.customId.split(CUSTOM_ID_SEPARATOR);
    if (parts.length >= 4) {
      const invokerId = parts[2];
      return invokerId !== undefined && invokerId === interaction.user.id;
    }
    return true;
  }
}
