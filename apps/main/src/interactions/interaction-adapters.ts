/**
 * UR-20261012-043 (A2.1) — the interaction ADAPTERS, extracted from `bootstrap.ts`.
 *
 * The dispatcher was entangled with the boot file: three inline adapter objects, built from raw
 * discord.js interactions, sitting inside one giant `interactionCreate` closure that also held the
 * router, the registry, the database and the logger. That entanglement is why a persona could be
 * online with its commands registered and still not answer its own buttons — the code that turns a
 * button press into a dispatchable interaction lived only in the main bot's boot path.
 *
 * These functions are pure: a raw interaction in, an adapter out. They read no configuration and
 * close over nothing, so the main bot and every hosted persona dispatch through the SAME adapters,
 * and the behaviour can be tested without a Discord connection.
 *
 * discord.js defines `channel` and `memberPermissions` as getter-only, so an interaction cannot be
 * enriched in place (assigning throws "Cannot set property channel of #<BaseInteraction> which has
 * only a getter", which rejects the listener and leaves the interaction unacknowledged). Hence a
 * plain adapter object carrying the shape the router and registry expect.
 */
import type { CommandInteraction } from '../commands/command-router.js';
import { TRACKED_PERMISSION_NAMES } from '../permissions/rank.js';
import type { ComponentInteraction } from './interaction-registry.js';

/**
 * §9.6 — the permission NAMES this adapter collects from a member.
 *
 * UR-20261012-053 — DERIVED from `permissions/rank.ts`, not hand-written. The hand-written list had
 * drifted: it omitted `ManageMessages`, which both MODERATOR_BUNDLE and HELPER_BUNDLE require, so no
 * moderator or helper could ever satisfy their bundle and both evaluated as MEMBER.
 *
 * The rank bundles are expressed in NAMES (`'Administrator'`, `'KickMembers'`, …), so this list is in
 * names too — a bit value like `'8'` can never match them.
 */
export const ADMIN_PERMISSION_BITS: readonly string[] = TRACKED_PERMISSION_NAMES;

/** One of the permission bits above — the values these adapters ask Discord about. */
export type AdminPermissionBit = (typeof ADMIN_PERMISSION_BITS)[number];

/** The structural slice of a raw discord.js interaction these adapters read. */
export interface RawInteractionLike {
  readonly commandName?: string;
  readonly customId?: string;
  readonly id?: string;
  readonly user?: { readonly id?: string };
  readonly guildId?: string | null;
  /** UR-20261012-060 — Discord states the application an interaction is for. */
  readonly applicationId?: string;
  readonly guild?: { readonly ownerId?: string | null } | null;
  readonly channel?: {
    readonly id?: string;
    readonly parentId?: string | null;
    readonly isNSFW?: () => boolean;
  } | null;
  readonly member?: {
    readonly permissions?: { has: (p: AdminPermissionBit) => boolean };
    readonly roles?: { readonly cache?: { keys: () => IterableIterator<string> } };
  } | null;
  readonly options?: unknown;
  readonly values?: readonly string[];
  readonly fields?: { getTextInputValue(name: string): string };
  readonly replied?: boolean;
  readonly deferred?: boolean;
  reply(options: unknown): Promise<unknown>;
  deferReply(options?: { flags?: number | bigint }): Promise<unknown>;
  editReply(options: unknown): Promise<unknown>;
  deferUpdate?(): Promise<unknown>;
  showModal?(modal: unknown): Promise<unknown>;
  update?(options: unknown): Promise<unknown>;
}

function memberPermissions(member: RawInteractionLike['member']): readonly string[] | undefined {
  if (member?.permissions === undefined) return undefined;
  const permissions = member.permissions;
  return ADMIN_PERMISSION_BITS.filter((p) => permissions.has(p) === true);
}

/** Builds the router's `CommandInteraction` from a chat-input interaction. */
export function toCommandInteraction(interaction: RawInteractionLike): CommandInteraction {
  const channel = interaction.channel;
  const member = interaction.member;
  const permissions = memberPermissions(member);
  return {
    commandName: interaction.commandName ?? '',
    user: { id: interaction.user?.id ?? '' },
    guildId: interaction.guildId ?? null,
    ...(interaction.applicationId !== undefined
      ? { applicationId: interaction.applicationId }
      : {}),
    reply: interaction.reply.bind(interaction) as unknown as CommandInteraction['reply'],
    deferReply: interaction.deferReply.bind(
      interaction,
    ) as unknown as CommandInteraction['deferReply'],
    editReply: interaction.editReply.bind(
      interaction,
    ) as unknown as CommandInteraction['editReply'],
    ...(interaction.replied !== undefined ? { replied: interaction.replied } : {}),
    ...(interaction.deferred !== undefined ? { deferred: interaction.deferred } : {}),
    ...(interaction.options !== undefined ? { options: interaction.options } : {}),
    ...(channel?.id !== undefined
      ? {
          channel: {
            id: channel.id,
            categoryId: channel.parentId ?? null,
            isNsfw: channel.isNSFW?.() ?? false,
          },
        }
      : {}),
    ...(permissions !== undefined ? { memberPermissions: permissions } : {}),
    ...(member?.roles?.cache !== undefined ? { memberRoles: [...member.roles.cache.keys()] } : {}),
    // §9.6 — the rank function reads the guild owner as OWNER, ahead of any permission bit.
    // Omitting it made a guild owner who lacks an explicit Administrator bit evaluate as
    // RESTRICTED and get a spurious FORBIDDEN (UR-20261011-018).
    isGuildOwner: interaction.guild?.ownerId === interaction.user?.id,
  };
}

/** Builds the registry's `ComponentInteraction` from a button or string-select interaction. */
export function toComponentInteraction(interaction: RawInteractionLike): ComponentInteraction {
  const componentPermissions = memberPermissions(interaction.member);
  return {
    ...(interaction.id !== undefined ? { id: interaction.id } : {}),
    customId: interaction.customId ?? '',
    user: { id: interaction.user?.id ?? '' },
    guildId: interaction.guildId ?? null,
    ...(interaction.applicationId !== undefined
      ? { applicationId: interaction.applicationId }
      : {}),
    // UR-20261012-054 — same context as the command adapter, so a re-render keeps the admin gate.
    ...(componentPermissions !== undefined ? { memberPermissions: componentPermissions } : {}),
    isGuildOwner: interaction.guild?.ownerId === interaction.user?.id,
    reply: interaction.reply.bind(interaction) as unknown as ComponentInteraction['reply'],
    deferReply: interaction.deferReply.bind(
      interaction,
    ) as unknown as ComponentInteraction['deferReply'],
    editReply: interaction.editReply.bind(
      interaction,
    ) as unknown as ComponentInteraction['editReply'],
    ...(interaction.deferUpdate !== undefined
      ? {
          deferUpdate: interaction.deferUpdate.bind(interaction) as unknown as () => Promise<void>,
        }
      : {}),
    ...(interaction.values !== undefined ? { values: interaction.values } : {}),
    ...(interaction.showModal !== undefined
      ? {
          showModal: interaction.showModal.bind(interaction) as unknown as (
            modal: unknown,
          ) => Promise<void>,
        }
      : {}),
  };
}

export const DISCOVER_MODAL_PREFIX = ['dumby', 'discover', 'submit'] as const;

/**
 * Reads a Discover modal submission — the one modal the framework opens. Returns `undefined` for
 * any other modal, and for a submission whose invoker is not the one the control was minted for.
 */
export function readDiscoverModalSubmission(
  interaction: RawInteractionLike,
  invokerId: string,
): { readonly query: string } | undefined {
  const parts = (interaction.customId ?? '').split(':');
  if (parts[0] !== DISCOVER_MODAL_PREFIX[0]) return undefined;
  if (parts[1] !== DISCOVER_MODAL_PREFIX[1]) return undefined;
  if (parts[2] !== DISCOVER_MODAL_PREFIX[2]) return undefined;
  if (parts[3] !== invokerId) return undefined;
  if (interaction.fields === undefined) return undefined;
  return { query: interaction.fields.getTextInputValue('query') };
}
