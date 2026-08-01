/**
 * Command registry — holds all registered slash command definitions
 * (Cluster: Frame). Commands are registered by modules during their
 * onLoad lifecycle hook. CollisionDetection runs at Stage 13.
 *
 * Tiers are module-wide manifest configuration, never repeated on each
 * command. The registry records module tier metadata separately from
 * command handlers so deployment can still scope commands by their owner.
 */
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import type { ModuleTier } from '../modules/tier-rules.js';

export interface CommandDefinition {
  /** Slash command builder JSON — the source of truth for the API payload. */
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  /** Handler invoked when the interaction arrives. */
  execute: (interaction: unknown) => Promise<void>;
  /** Module that owns this command — for isolation enforcement. */
  moduleId: string;
  /** Commands are guild-only unless a future contract explicitly opts out. */
  guildOnly?: boolean;
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

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>();
  private readonly moduleTiers = new Map<string, ModuleTier>();

  registerModule(moduleId: string, tier: ModuleTier): void {
    this.moduleTiers.set(moduleId, tier);
  }

  register(def: CommandDefinition): void {
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

  getModuleTier(moduleId: string): ModuleTier | undefined {
    return this.moduleTiers.get(moduleId);
  }

  tierForCommand(def: CommandDefinition): ModuleTier | undefined {
    return this.getModuleTier(def.moduleId);
  }

  /** Returns all commands as REST-ready JSON payloads for bulk registration. */
  toApiPayloads(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return this.all().map((c) => c.data);
  }
}
