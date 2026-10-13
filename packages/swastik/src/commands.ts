/**
 * §1.7 / interface.md §10.5 — the schema-declared authoring model. A module declares a command
 * schema with `defineCommand` and its handler returns page data; the Renderer derives the whole
 * presentation from that data, so module code never constructs components, embeds or flags.
 */
/**
 * §6.7 — a declared side effect. A module cannot reach the host process, so it cannot write to the
 * queue, the database or anything else itself; it declares what should happen and the host
 * performs it, which keeps the handler free of side effects during its own execution.
 */
export interface CommandEffect {
  readonly kind: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface CommandPageData {
  readonly page: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly effects?: readonly CommandEffect[];
}

/**
 * §11 (system-map) — WHO a dispatch is running as, and WHERE.
 *
 * The framework hosts the main bot and any number of personas in ONE process. Before this, a module
 * could not tell which of them was running its command: `CommandContext` carried config and page data
 * and nothing about identity, so a handler had no way to know whose signal it was answering, which
 * application it should speak as, or which guild it was bound to. Every module-facing decision that
 * depended on that had to be made by the core on the module's behalf — which is how the core came to
 * hold facts the modules own.
 *
 * This is the module-facing half of the framework's identity: one object, built once at dispatch from
 * the interaction Discord hands us, and never re-derived.
 */
export interface ExecutionIdentity {
  /** `'main'` for the main bot, or the persona's id. The profile running this command. */
  readonly profileId: string;
  /** Which of the two this is. A persona is single-guild and can refuse; the main bot serves all. */
  readonly kind: 'main' | 'persona';
  /** The Discord application this identity speaks as — the one that owns its emoji and commands. */
  readonly applicationId: string;
  /** The identity's display name: the bot's username, or the persona's registered name. */
  readonly profileName: string;
  /** The guild the signal came from. `null` in a direct message. */
  readonly guildId: string | null;
  /**
   * The ONE guild this identity serves. Absent for the main bot, which serves every guild it is
   * installed in; present for a persona, which refuses everywhere else.
   */
  readonly boundGuildId?: string;
}

/**
 * §11 / §13.2 — the module's OWN standing in the guild this dispatch is running in.
 *
 * "Where is this module installed, where is it running, and whose is it." A standard or marketplace
 * module belongs to ONE profile per guild, first come; core belongs to nobody and runs for everyone.
 */
export interface ModuleStanding {
  /** The module this command belongs to. */
  readonly moduleId: string;
  /** The module's tier, as its own manifest declares it. */
  readonly tier: 'admin' | 'core' | 'standard' | 'marketplace';
  /** Whether the module is enabled in this guild. Core is always enabled. */
  readonly enabled: boolean;
  /**
   * Which profile HOLDS this module here: `'main'`, a persona id, or `'shared'` for core, which no
   * profile owns and every profile runs.
   */
  readonly owner: string;
  /** Whether the identity running this dispatch is the one that holds it. */
  readonly ownedByCaller: boolean;
}

export interface CommandContext {
  readonly config: Readonly<Record<string, unknown>>;
  /**
   * §11 — who is running this command and where. Always present: a handler that needs to know whose
   * signal it is answering can ask, instead of the core having to decide for it.
   */
  readonly identity: ExecutionIdentity;
  /**
   * §11 / §13.2 — this module's own standing in that guild: its tier, whether it is enabled, which
   * profile holds it, and whether that is the caller.
   */
  readonly module: ModuleStanding;
  /**
   * Host-supplied data for the command's declared page. The framework gathers it at dispatch —
   * live metrics, the module registry, queue state, persona bindings — so a module can present
   * runtime state without reaching into the host process itself, which it cannot do. Empty when
   * the host supplies nothing for the module.
   */
  readonly data: Readonly<Record<string, unknown>>;
}

export type CommandHandler = (
  interaction: unknown,
  context: CommandContext,
) => Promise<CommandPageData> | CommandPageData;

/** Layer 6 vocabulary, canonical short form (blueprint §21). */
export type CommandRbacRequirement =
  | 'RESTRICTED'
  | 'MEMBER'
  | 'HELPER'
  | 'MOD'
  | 'ADMIN'
  | 'OWNER';

export interface CommandPermissionsDeclaration {
  readonly discord?: readonly string[];
  readonly rbac?: CommandRbacRequirement;
  readonly nsfw?: boolean;
}

/** A slash-command option (Discord `ApplicationCommandOptionType` number in `type`). */
export interface CommandOptionDeclaration {
  readonly name: string;
  readonly description: string;
  readonly type: number;
  readonly required?: boolean;
  readonly autocomplete?: boolean;
}

export interface CommandDeclaration {
  readonly name: string;
  readonly description: string;
  readonly pages: readonly string[];
  readonly execute: CommandHandler;
  readonly guildOnly?: boolean;
  readonly options?: readonly CommandOptionDeclaration[];
  readonly permissions?: CommandPermissionsDeclaration;
  /** UR-A-03 / finding #3 — the middleware metadata the framework reads. */
  readonly requiresDefer?: boolean;
  readonly ephemeral?: boolean;
  readonly cooldownMs?: number;
}

export function defineCommand(declaration: CommandDeclaration): CommandDeclaration {
  if (declaration.name.trim().length === 0) {
    throw new Error('command name is required');
  }
  if (declaration.pages.length === 0) {
    throw new Error(`command "${declaration.name}" must declare at least one page`);
  }
  return declaration;
}
