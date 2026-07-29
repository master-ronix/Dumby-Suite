/**
 * Command registry — holds all registered slash command definitions
 * (Cluster: Frame). Commands are registered by modules during their
 * onLoad lifecycle hook. CollisionDetection runs at Stage 13.
 */
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

export interface CommandDefinition {
  /** Slash command builder JSON — the source of truth for the API payload. */
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  /** Handler invoked when the interaction arrives. */
  execute: (interaction: unknown) => Promise<void>;
  /** Module that owns this command — for isolation enforcement. */
  moduleId: string;
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

  /** Returns all commands as REST-ready JSON payloads for bulk registration. */
  toApiPayloads(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return this.all().map((c) => c.data);
  }
}
