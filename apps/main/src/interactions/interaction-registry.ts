import type { Redis } from 'ioredis';
import { MessageFlags } from 'discord.js';

export interface ComponentInteraction {
  id?: string;
  customId: string;
  user: { id: string };
  guildId: string | null;
  /**
   * UR-20261012-060 — the application this interaction is FOR, as Discord states it. This is the
   * authoritative emoji scope: an application emoji may only be referenced by the application that
   * owns it, so the render must use the id of the application that received the interaction.
   */
  applicationId?: string;
  /**
   * UR-20261012-054 — the member's permission context, carried so a control that re-enters the router
   * (`asPageInteraction`) does not LOSE it.
   *
   * Without these, an admin-gated control rendered on a page's first paint and vanished on every
   * re-render: the component path had no permissions, so `isGuildAdmin` returned false and the control
   * was not drawn. The operator saw the Info control appear and then disappear on switch or refresh.
   */
  memberPermissions?: readonly string[];
  isGuildOwner?: boolean;
  reply: (options: unknown) => Promise<void>;
  deferReply: (options?: { flags?: number | bigint }) => Promise<void>;
  deferUpdate?: () => Promise<void>;
  editReply: (options: unknown) => Promise<void>;
  /**
   * A FOLLOW-UP reply, which is the only way to say something private beside a public page refresh.
   * An interaction gets ONE initial response — the page edit — so a confirmation that must not be
   * broadcast has to come after it. The renderer still blocks this for module code; the frame's own
   * controls are not module code.
   */
  followUp?: (options: unknown) => Promise<void>;
  /** item 5 — a control may open a modal (the Discover search text-input interface). */
  showModal?: (modal: unknown) => Promise<void>;
  /** §11.3 — the chosen option values, present only on a String Select Menu interaction. */
  values?: readonly string[];
}

/**
 * item 5/8/9 — how the registry acknowledges a control:
 *   'update'    (default) deferUpdate; the handler edits the message in place.
 *   'ephemeral' deferReply(ephemeral); the handler sends a private (hidden) response.
 *   'none'      no acknowledgement; the handler opens a modal instead.
 */
export type AckMode = 'update' | 'ephemeral' | 'none';

export interface IComponentHandler {
  customIdPrefix: string;
  parse(customId: string): unknown;
  idempotencyKey?: (interaction: ComponentInteraction, context: unknown) => string;
  /** Defaults to 'update'. */
  ack?: AckMode;
  /**
   * Permit this handler to send a PRIVATE follow-up message.
   *
   * Off by default: Appendix C #20 keeps a handler from opening a response path of its own, and
   * `editReply` on the acknowledged message is normally the only way out. It is opt-in because one
   * answer has no other honest route — a REFUSAL must be private, and the interaction's own response
   * is already spent on the public `deferUpdate` that keeps the page editing in place. `reply` and
   * `showModal` stay blocked; only `followUp` opens, and only for a handler that declares it.
   */
  allowFollowUp?: boolean;
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
  renderer?: { createReadOnlyInteraction<T extends object>(interaction: T, options?: { allowFollowUp?: boolean }): T };
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
    { createReadOnlyInteraction<T extends object>(interaction: T, options?: { allowFollowUp?: boolean }): T } | undefined;

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

    // item 5/8/9 — acknowledge per the handler's mode: edit-in-place (default), a private reply, or
    // nothing (the handler opens a modal).
    const ack = handler.ack ?? 'update';
    if (ack === 'none') {
      // The handler calls `showModal`; acknowledging here would consume the interaction.
    } else if (ack === 'ephemeral') {
      // §1.2/§2.4 — the private (hidden) acknowledgement. `ephemeral: true` is deprecated in
      // discord.js; the supported form is the `Ephemeral` message flag.
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } else if (this.acknowledge !== undefined) {
      await this.acknowledge(interaction);
    }

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    // A modal-opening control needs the raw interaction (to call `showModal`); every other control
    // gets the Renderer's read-only guard, so it cannot bypass the Renderer. A handler that declares
    // `allowFollowUp` keeps that guard but gains the one exit it needs for a private answer.
    const safeInteraction =
      ack === 'none' || this.renderer === undefined
        ? interaction
        : this.renderer.createReadOnlyInteraction(interaction, {
            allowFollowUp: handler.allowFollowUp === true,
          });
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
