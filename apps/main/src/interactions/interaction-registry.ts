import type { Redis } from 'ioredis';

export interface ComponentInteraction {
  id?: string;
  customId: string;
  user: { id: string };
  guildId: string | null;
  reply: (options: unknown) => Promise<void>;
  deferReply: (options?: { ephemeral?: boolean }) => Promise<void>;
  deferUpdate?: () => Promise<void>;
  editReply: (options: unknown) => Promise<void>;
  /** §11.3 — the chosen option values, present only on a String Select Menu interaction. */
  values?: readonly string[];
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
  acknowledge?: (interaction: ComponentInteraction) => Promise<void>;
  /** Appendix C #19 — a shared idempotency store so dedup survives across pods/restarts. */
  idempotency?: IdempotencyStore;
  /**
   * Appendix C #20 — the Renderer's read-only guard. When provided, component handlers receive a
   * read-only interaction so the component path cannot bypass the Renderer and reply directly.
   */
  renderer?: { createReadOnlyInteraction<T extends object>(interaction: T): T };
}

/** Appendix C #19 — the idempotency contract, so the in-memory default can be swapped for Redis. */
export interface IdempotencyStore {
  has(key: string): Promise<boolean>;
  add(key: string): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly seen = new Set<string>();
  async has(key: string): Promise<boolean> {
    return this.seen.has(key);
  }
  async add(key: string): Promise<void> {
    this.seen.add(key);
  }
}

export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds = 15 * 60,
  ) {}
  async has(key: string): Promise<boolean> {
    return (await this.redis.get(`dumby:idem:${key}`)) !== null;
  }
  async add(key: string): Promise<void> {
    await this.redis.set(`dumby:idem:${key}`, '1', 'EX', this.ttlSeconds);
  }
}

const CUSTOM_ID_SEPARATOR = ':';
const CUSTOM_ID_MAX_LENGTH = 100;
export const AUTOCOMPLETE_BUDGET_MS = 800;

export class InteractionRegistry {
  private readonly handlers = new Map<string, IComponentHandler>();
  private readonly inFlight = new Map<string, Promise<boolean>>();
  private readonly idempotency: IdempotencyStore;
  private readonly acknowledge: ((interaction: ComponentInteraction) => Promise<void>) | undefined;
  private readonly renderer:
    { createReadOnlyInteraction<T extends object>(interaction: T): T } | undefined;

  constructor(options: InteractionRegistryOptions = {}) {
    this.acknowledge = options.acknowledge;
    this.idempotency = options.idempotency ?? new InMemoryIdempotencyStore();
    this.renderer = options.renderer;
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
    if (await this.idempotency.has(key)) return true;

    if (this.acknowledge !== undefined) {
      await this.acknowledge(interaction);
    }

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const safeInteraction =
      this.renderer === undefined
        ? interaction
        : this.renderer.createReadOnlyInteraction(interaction);
    const pending = handler
      .execute(safeInteraction, context)
      .then(async () => {
        await this.idempotency.add(key);
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

  private invokerMatches(interaction: ComponentInteraction): boolean {
    const parts = interaction.customId.split(CUSTOM_ID_SEPARATOR);
    // Appendix C #20 — a customId that was not minted by this registry (fewer than four parts)
    // carries no invoker binding, so it fails closed rather than bypassing the re-check.
    if (parts.length < 4) return false;
    const invokerId = parts[2];
    return invokerId !== undefined && invokerId === interaction.user.id;
  }
}
