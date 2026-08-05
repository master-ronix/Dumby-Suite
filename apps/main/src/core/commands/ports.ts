import type { Knex } from 'knex';
import type {
  CommandChangeEntry,
  CommandCollision,
  CommandContext,
  CommandJson,
  CommandOverride,
  CommandTier,
  DeploymentScope,
  DeploymentTarget,
  GuildModuleStatus,
  IdentityId,
  ModuleCommandSet,
  Snowflake,
  SupportedCommandInteraction,
} from './types.js';
import type { CommandRegistry } from './CommandRegistry.js';

export interface LoggerPort {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug?(message: string, data?: Record<string, unknown>): void;
}

export interface EventCatalogPayloads {
  'guild.command.change.queued': { entry: CommandChangeEntry };
  'guild.command.change.pushed': { guildId: Snowflake; identityId: IdentityId | null; ids: string[] };
  'guild.command.change.failed': {
    guildId: Snowflake;
    identityId: IdentityId | null;
    ids: string[];
    reason: string;
  };
  'guild.command.change.invalidated': { ids: string[]; reason: string };
  'guild.command.collision.detected': { collision: CommandCollision };
  'guild.command.collision.resolved': { collision: CommandCollision; override: CommandOverride };
  'guild.command.collision.auto_reassigned': { override: CommandOverride };
  'guild.command.deployment.started': { scope: DeploymentScope; guildId?: Snowflake; identityId: IdentityId };
  'guild.command.deployment.completed': {
    scope: DeploymentScope;
    guildId?: Snowflake;
    identityId: IdentityId;
    commandCount: number;
    changed: boolean;
  };
  'guild.command.deployment.failed': {
    scope: DeploymentScope;
    guildId?: Snowflake;
    identityId: IdentityId;
    reason: string;
  };
  'guild.command.registry.frozen': { size: number };
  'guild.command.registry.replaced': { previousSize: number; newSize: number };
  'guild.command.hotswap.succeeded': { moduleSlug: string; previousSize: number; newSize: number };
  'guild.command.hotswap.failed': { moduleSlug: string; reason: string };
}

export interface EventBusPort {
  emit<K extends keyof EventCatalogPayloads>(event: K, payload: EventCatalogPayloads[K]): void;
}

export interface AuditLogEntry {
  source: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeState: unknown;
  afterState: unknown;
  reason?: string | undefined;
  timestamp: Date;
}

export interface AuditLogPort {
  write(entry: AuditLogEntry): Promise<void>;
}

export interface MetricsPort {
  setGauge(name: string, value: number, labels?: Record<string, string>): void;
  increment(name: string, labels?: Record<string, string>, value?: number): void;
  observe(name: string, value: number, labels?: Record<string, string>): void;
}

export interface SpanPort {
  end(): void;
  recordException(error: unknown): void;
  setAttribute(key: string, value: string | number | boolean): void;
}

export interface TracerPort {
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): SpanPort;
}

export interface DiscordApplicationCommandRestPort {
  listGlobalCommands(identityId: IdentityId): Promise<CommandJson[]>;
  listGuildCommands(identityId: IdentityId, guildId: Snowflake): Promise<CommandJson[]>;
  bulkOverwriteGlobalCommands(identityId: IdentityId, commands: CommandJson[]): Promise<void>;
  bulkOverwriteGuildCommands(
    identityId: IdentityId,
    guildId: Snowflake,
    commands: CommandJson[],
  ): Promise<void>;
}

export interface GuildModuleStatePort {
  getStatus(guildId: Snowflake, moduleSlug: string, tier: CommandTier): Promise<GuildModuleStatus>;
  setStatus(
    guildId: Snowflake,
    moduleSlug: string,
    tier: CommandTier,
    status: GuildModuleStatus,
    actorId: string,
  ): Promise<void>;
  listGuildsWhereActive(moduleSlug: string, tier: CommandTier): Promise<Snowflake[]>;
  invalidate(guildId: Snowflake, moduleSlug: string): Promise<void>;
}

export interface CommandPermissionOverridePort {
  denyCommandForEveryoneAndConfiguredRoles(
    guildId: Snowflake,
    identityId: IdentityId,
    commandKey: string,
  ): Promise<void>;
  removeDenyOverrides(guildId: Snowflake, identityId: IdentityId, commandKey: string): Promise<void>;
}

export interface MiddlewarePipelinePort {
  execute(
    interaction: SupportedCommandInteraction,
    context: CommandContext,
    command: unknown,
    next: () => Promise<void>,
  ): Promise<void>;
}

export interface CommandContextFactoryPort {
  create(interaction: unknown, command: unknown): Promise<CommandContext>;
}

export interface PersonaBindingRepositoryPort {
  getBinding(guildId: Snowflake, moduleSlug: string): Promise<IdentityId | null>;
  setBinding(guildId: Snowflake, moduleSlug: string, identityId: IdentityId, actorId: string): Promise<void>;
  listBindings(guildId: Snowflake): Promise<Map<string, IdentityId>>;
  isSuspended(identityId: IdentityId): Promise<boolean>;
}

export interface CommandOverrideRepositoryPort {
  findByCommandKey(
    guildId: Snowflake,
    identityId: IdentityId | null,
    commandKey: string,
  ): Promise<CommandOverride | null>;
  upsert(override: CommandOverride): Promise<CommandOverride>;
  list(guildId: Snowflake, identityId: IdentityId | null): Promise<CommandOverride[]>;
  invalidateCache(guildId: Snowflake, identityId: IdentityId | null): Promise<void>;
}

export interface CommandCollisionRepositoryPort {
  create(collision: CommandCollision): Promise<CommandCollision>;
  update(collision: CommandCollision): Promise<CommandCollision>;
  findUnresolved(
    guildId: Snowflake,
    identityId: IdentityId | null,
    commandKey: string,
  ): Promise<CommandCollision | null>;
}

export interface CommandChangeQueueRepositoryPort {
  insert(entry: CommandChangeEntry): Promise<CommandChangeEntry>;
  update(entry: CommandChangeEntry): Promise<CommandChangeEntry>;
  findOpenBatch(
    guildId: Snowflake,
    identityId: IdentityId | null,
    now: Date,
  ): Promise<CommandChangeEntry[]>;
  findPendingForGuildIdentity(
    guildId: Snowflake,
    identityId: IdentityId | null,
  ): Promise<CommandChangeEntry[]>;
  findDueBatches(now: Date): Promise<CommandChangeEntry[][]>;
  invalidatePendingDeletion(moduleSlug: string, reason: string, now: Date): Promise<CommandChangeEntry[]>;
}

export interface DistributedLockPort {
  withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}

export interface CachePort {
  del(key: string): Promise<void>;
}

export interface ModuleLifecyclePort {
  unload(moduleSlug: string): Promise<void>;
  load(moduleSlug: string): Promise<void>;
  ready(moduleSlug: string): Promise<void>;
  collectLoadedModules(): Promise<ModuleCommandSet[]>;
}

export interface RegistryReferencePort {
  get(): CommandRegistry;
  replace(next: CommandRegistry): void;
}

export interface ClockPort {
  now(): Date;
}

export interface IdGeneratorPort {
  uuid(): string;
}

export interface KnexProviderPort {
  knex: Knex;
}
