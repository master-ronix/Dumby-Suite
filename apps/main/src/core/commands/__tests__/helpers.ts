import { ApplicationCommandType, ContextMenuCommandBuilder, SlashCommandBuilder } from 'discord.js';
import { vi } from 'vitest';
import { CommandRegistry } from '../CommandRegistry.js';
import type {
  AuditLogPort,
  ClockPort,
  CommandChangeQueueRepositoryPort,
  DiscordApplicationCommandRestPort,
  EventBusPort,
  GuildModuleStatePort,
  IdGeneratorPort,
  LoggerPort,
  MiddlewarePipelinePort,
  PersonaBindingRepositoryPort,
  CommandContextFactoryPort,
  CommandOverrideRepositoryPort,
  CommandCollisionRepositoryPort,
} from '../ports.js';
import type {
  CommandChangeEntry,
  CommandJson,
  CommandTier,
  ICommand,
  IdentityId,
  Snowflake,
} from '../types.js';

export function slash(name: string): ICommand {
  return {
    data: new SlashCommandBuilder().setName(name).setDescription(`${name} command`),
    execute: vi.fn(async () => undefined),
  };
}

export function slashWithSub(name: string, sub: string): ICommand {
  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(`${name} command`)
      .addSubcommand((builder) => builder.setName(sub).setDescription(`${sub} sub`)),
    execute: vi.fn(async () => undefined),
  };
}

export function slashWithGroup(name: string, group: string, sub: string): ICommand {
  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(`${name} command`)
      .addSubcommandGroup((builder) =>
        builder
          .setName(group)
          .setDescription(`${group} group`)
          .addSubcommand((child) => child.setName(sub).setDescription(`${sub} sub`)),
      ),
    execute: vi.fn(async () => undefined),
  };
}

export function userMenu(name: string): ICommand {
  return {
    data: new ContextMenuCommandBuilder().setName(name).setType(ApplicationCommandType.User),
    execute: vi.fn(async () => undefined),
  };
}

export function messageMenu(name: string): ICommand {
  return {
    data: new ContextMenuCommandBuilder().setName(name).setType(ApplicationCommandType.Message),
    execute: vi.fn(async () => undefined),
  };
}

export function registry(entries: Array<{ moduleSlug: string; tier: CommandTier; command: ICommand }>): CommandRegistry {
  return CommandRegistry.buildFrozen(entries);
}

export const logger: LoggerPort = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

export const events: EventBusPort = { emit: vi.fn() };
export const audit: AuditLogPort = { write: vi.fn(async () => undefined) };
export const clock: ClockPort = { now: () => new Date('2026-08-02T00:00:00.000Z') };
export const ids: IdGeneratorPort = { uuid: vi.fn(() => `id-${Math.random()}`) };

export class MemoryRest implements DiscordApplicationCommandRestPort {
  global = new Map<IdentityId, CommandJson[]>();
  guild = new Map<string, CommandJson[]>();
  writes: string[] = [];

  async listGlobalCommands(identityId: IdentityId): Promise<CommandJson[]> {
    return this.global.get(identityId) ?? [];
  }

  async listGuildCommands(identityId: IdentityId, guildId: Snowflake): Promise<CommandJson[]> {
    return this.guild.get(`${identityId}:${guildId}`) ?? [];
  }

  async bulkOverwriteGlobalCommands(identityId: IdentityId, commands: CommandJson[]): Promise<void> {
    this.writes.push(`global:${identityId}`);
    this.global.set(identityId, commands);
  }

  async bulkOverwriteGuildCommands(identityId: IdentityId, guildId: Snowflake, commands: CommandJson[]): Promise<void> {
    this.writes.push(`guild:${identityId}:${guildId}`);
    this.guild.set(`${identityId}:${guildId}`, commands);
  }
}

export class MemoryQueueRepo implements CommandChangeQueueRepositoryPort {
  entries: CommandChangeEntry[] = [];

  async insert(entry: CommandChangeEntry): Promise<CommandChangeEntry> {
    this.entries.push(entry);
    return entry;
  }

  async update(entry: CommandChangeEntry): Promise<CommandChangeEntry> {
    this.entries = this.entries.map((existing) => (existing.id === entry.id ? entry : existing));
    return entry;
  }

  async findOpenBatch(guildId: Snowflake, identityId: IdentityId | null, now: Date): Promise<CommandChangeEntry[]> {
    return this.entries.filter(
      (entry) =>
        entry.guildId === guildId &&
        entry.identityId === identityId &&
        ['pending', 'failed'].includes(entry.status) &&
        (entry.scheduledPushAt?.getTime() ?? 0) > now.getTime(),
    );
  }

  async findPendingForGuildIdentity(guildId: Snowflake, identityId: IdentityId | null): Promise<CommandChangeEntry[]> {
    return this.entries.filter((entry) => entry.guildId === guildId && entry.identityId === identityId);
  }

  async findDueBatches(now: Date): Promise<CommandChangeEntry[][]> {
    const due = this.entries.filter(
      (entry) =>
        ['pending', 'failed'].includes(entry.status) &&
        (entry.scheduledPushAt?.getTime() ?? Number.POSITIVE_INFINITY) <= now.getTime(),
    );
    return due.length > 0 ? [due] : [];
  }

  async invalidatePendingDeletion(moduleSlug: string, reason: string, now: Date): Promise<CommandChangeEntry[]> {
    const changed = this.entries.filter(
      (entry) => entry.moduleSlug === moduleSlug && entry.changeType === 'module_disable_deletion',
    );
    this.entries = this.entries.map((entry) =>
      changed.includes(entry)
        ? { ...entry, status: 'invalidated', invalidatedAt: now, failureReason: reason }
        : entry,
    );
    return changed.map((entry) => ({ ...entry, status: 'invalidated', invalidatedAt: now }));
  }
}

export const moduleState = (activeGuilds: Record<string, string[]> = {}): GuildModuleStatePort => ({
  getStatus: vi.fn(async (_guildId, _moduleSlug, tier) =>
    tier === 'marketplace' ? 'never_installed' : 'active',
  ),
  setStatus: vi.fn(async () => undefined),
  listGuildsWhereActive: vi.fn(async (moduleSlug) => activeGuilds[moduleSlug] ?? []),
  invalidate: vi.fn(async () => undefined),
});

export class MemoryPersonaRepo implements PersonaBindingRepositoryPort {
  bindings = new Map<string, IdentityId>();
  suspended = new Set<IdentityId>();

  async getBinding(guildId: Snowflake, moduleSlug: string): Promise<IdentityId | null> {
    return this.bindings.get(`${guildId}:${moduleSlug}`) ?? null;
  }

  async setBinding(guildId: Snowflake, moduleSlug: string, identityId: IdentityId): Promise<void> {
    this.bindings.set(`${guildId}:${moduleSlug}`, identityId);
  }

  async listBindings(guildId: Snowflake): Promise<Map<string, IdentityId>> {
    return new Map(
      [...this.bindings.entries()]
        .filter(([key]) => key.startsWith(`${guildId}:`))
        .map(([key, value]) => [key.split(':')[1] ?? '', value]),
    );
  }

  async isSuspended(identityId: IdentityId): Promise<boolean> {
    return this.suspended.has(identityId);
  }
}

export const middleware: MiddlewarePipelinePort = {
  execute: vi.fn(async (_interaction, _context, _command, next) => next()),
};

export const contextFactory: CommandContextFactoryPort = {
  create: vi.fn(async () => ({
    correlationId: 'corr',
    guildConfig: {},
    locale: 'en-US',
    rbacRole: 'MEMBER',
    logger,
    shardId: 0,
    metadata: new Map(),
  })),
};

export class MemoryOverrideRepo implements CommandOverrideRepositoryPort {
  rows = new Map<string, Awaited<ReturnType<CommandOverrideRepositoryPort['upsert']>>>();
  async findByCommandKey(guildId: Snowflake, identityId: IdentityId | null, commandKey: string) {
    return this.rows.get(`${guildId}:${identityId ?? 'main'}:${commandKey}`) ?? null;
  }
  async upsert(override: Awaited<ReturnType<CommandOverrideRepositoryPort['upsert']>>) {
    this.rows.set(`${override.guildId}:${override.identityId ?? 'main'}:${override.commandKey}`, override);
    return override;
  }
  async list(): Promise<Awaited<ReturnType<CommandOverrideRepositoryPort['upsert']>>[]> {
    return [...this.rows.values()];
  }
  async invalidateCache(): Promise<void> {}
}

export class MemoryCollisionRepo implements CommandCollisionRepositoryPort {
  rows: Awaited<ReturnType<CommandCollisionRepositoryPort['create']>>[] = [];
  async create(collision: Awaited<ReturnType<CommandCollisionRepositoryPort['create']>>) {
    this.rows.push(collision);
    return collision;
  }
  async update(collision: Awaited<ReturnType<CommandCollisionRepositoryPort['create']>>) {
    this.rows = this.rows.map((row) => (row.id === collision.id ? collision : row));
    return collision;
  }
  async findUnresolved(guildId: Snowflake, identityId: IdentityId | null, commandKey: string) {
    return (
      this.rows.find(
        (row) =>
          row.guildId === guildId &&
          row.identityId === identityId &&
          row.commandKey === commandKey &&
          row.status === 'unresolved',
      ) ?? null
    );
  }
}
