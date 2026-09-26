import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import type { ModuleTier } from '../module-system/tier-rules.js';
import type { Rank } from '../permissions/rank.js';

export interface CommandPermissions {
  discord?: readonly string[];
  rbac?: Rank;
  nsfw?: boolean;
}

export interface CommandDefinition {
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  execute: (interaction: unknown) => Promise<unknown>;
  moduleId: string;
  guildOnly?: boolean;
  permissionDeclared?: boolean;
  permissions?: CommandPermissions;
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

  toApiPayloads(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return this.all().map((c) => c.data);
  }
}
