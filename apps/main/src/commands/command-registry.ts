import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import type { CommandContext } from '@workspace/swastik';
import type { ModuleTier } from '../module-system/tier-rules.js';
import type { Rank } from '../permissions/rank.js';

export interface CommandPermissions {
  discord?: readonly string[];
  rbac?: Rank;
  nsfw?: boolean;
}

/**
 * item 2 — WHICH profile a registry serves. A registry is built per identity; this names it so that
 * registration, loading, unloading and de-registration are profile-context aware. `applicationId` is
 * the Discord application the profile's commands deploy to ('' is the main bot's default scope).
 */
export interface CommandProfile {
  readonly kind: 'main' | 'persona';
  readonly id: string;
  readonly applicationId: string;
}

export interface CommandDefinition {
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute: (interaction: unknown, context: CommandContext) => Promise<unknown>;
  moduleId: string;
  guildOnly?: boolean;
  permissionDeclared?: boolean;
  permissions?: CommandPermissions;
  /** UR-A-03 / finding #3 — the metadata the built-in middlewares read. */
  requiresDefer?: boolean;
  ephemeral?: boolean;
  cooldownMs?: number;
  /** §1.7 — the module's manifest config, handed to the handler as `context.config`. */
  moduleConfig?: Readonly<Record<string, unknown>>;
  /** §1.5/§11.6 — the module's attribution for the identity band. */
  identity?: {
    readonly developer?: string;
    readonly version?: string;
    readonly displayName?: string;
    readonly accent?: string;
    readonly banner?: string;
    readonly buildId?: string;
    readonly devUsername?: string;
  };
}

export class CommandCollisionError extends Error {
  constructor(name: string, existingModuleId: string, newModuleId: string) {
    super(
      `Command collision: "${name}" is already registered by module "${existingModuleId}"; ` +
        `module "${newModuleId}" cannot register it again`,
    );
    this.name = 'CommandCollisionError';
  }
}

/**
 * Finding #19 — `register` used to accept a command from a module that was never registered, so a
 * command could exist with no module (and no tier) behind it. It now fails closed.
 */
export class CommandModuleNotRegisteredError extends Error {
  constructor(moduleId: string, commandName: string) {
    super(
      `Command "${commandName}" is registered by module "${moduleId}", which was never ` +
        `registered — call registerModule("${moduleId}", tier) first`,
    );
    this.name = 'CommandModuleNotRegisteredError';
  }
}

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly moduleTiers = new Map<string, ModuleTier>();
  private readonly _profile: CommandProfile;

  /**
   * item 2 — a registry is built PER IDENTITY, so it is profile-context aware by construction. The
   * main bot passes the default (`{ kind: 'main', id: 'main', applicationId: '' }`); a hosted persona
   * passes its own id and application id, so every register / load / unload / de-register it performs
   * is attributed to — and scoped to — that profile.
   */
  constructor(profile: CommandProfile = { kind: 'main', id: 'main', applicationId: '' }) {
    this._profile = profile;
  }

  /** item 2 — the profile this registry serves. */
  get profile(): CommandProfile {
    return this._profile;
  }

  registerModule(moduleId: string, tier: ModuleTier): void {
    this.moduleTiers.set(moduleId, tier);
  }

  register(def: CommandDefinition): void {
    if (!this.moduleTiers.has(def.moduleId)) {
      throw new CommandModuleNotRegisteredError(def.moduleId, def.data.name);
    }
    const existing = this.commands.get(def.data.name);
    if (existing) {
      throw new CommandCollisionError(def.data.name, existing.moduleId, def.moduleId);
    }
    this.commands.set(def.data.name, def);
  }

  get(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  all(): CommandDefinition[] {
    return [...this.commands.values()];
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  count(): number {
    return this.commands.size;
  }

  /** item 2 — de-registration: remove one command by name. Returns whether it was present. */
  unregister(name: string): boolean {
    return this.commands.delete(name);
  }

  /**
   * item 2 — de-registration: remove every command a module registered, and its tier, so an unloaded
   * module leaves nothing behind. Returns the names removed.
   */
  unregisterModule(moduleId: string): readonly string[] {
    const removed: string[] = [];
    for (const [name, def] of this.commands) {
      if (def.moduleId === moduleId) {
        this.commands.delete(name);
        removed.push(name);
      }
    }
    this.moduleTiers.delete(moduleId);
    return removed;
  }

  /** item 2 — de-registration: drop everything (a full unload of this profile's registry). */
  clear(): void {
    this.commands.clear();
    this.moduleTiers.clear();
  }

  /**
   * UR-20261012-067 — the registry's own view of an identity dimension: every module's tier, and which
   * modules the framework hosts.
   *
   * The registry cannot know WHICH profile a command runs under — that is a per-guild binding and is
   * resolved at dispatch into `CommandContext.module.owner`. What it can state, and now does, is the
   * module's own tier, which decides who MAY run it: `core` is shared by every profile, `admin` belongs
   * to the operator, and `standard`/`marketplace` belong to whichever profile claimed them.
   */
  modulesByTier(tier: ModuleTier): readonly string[] {
    return this.all()
      .filter((def) => this.getModuleTier(def.moduleId) === tier)
      .map((def) => def.moduleId);
  }

  getModuleTier(moduleId: string): ModuleTier | undefined {
    return this.moduleTiers.get(moduleId);
  }

  tierForCommand(def: CommandDefinition): ModuleTier | undefined {
    return this.getModuleTier(def.moduleId);
  }

  toApiPayloads(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return this.all().map((c) => c.data);
  }
}
