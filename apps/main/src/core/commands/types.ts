import type {
  APIApplicationCommandOption,
  APIApplicationCommandSubcommandGroupOption,
  APIApplicationCommandSubcommandOption,
  APIApplicationCommandAutocompleteInteraction,
  ApplicationCommandType,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBuilder,
  UserContextMenuCommandInteraction,
} from 'discord.js';

export type CommandTier = 'admin' | 'core' | 'standard' | 'marketplace';
export type CommandType = 'CHAT_INPUT' | 'USER_CONTEXT_MENU' | 'MESSAGE_CONTEXT_MENU';
export type CooldownScope = 'USER' | 'GUILD' | 'CHANNEL' | 'GLOBAL';
export type DeploymentScope = 'global' | 'guild' | 'development-guild';
export type IdentityId = string;
export type Snowflake = string;
export type CommandKey = string;

export const MAIN_IDENTITY_ID = 'main';
export const DISCORD_GUILD_COMMAND_CEILING = 100;
export const USER_CONTEXT_MENU_COMMAND_LIMIT = 5;
export const MESSAGE_CONTEXT_MENU_COMMAND_LIMIT = 5;
export const DEFAULT_RBAC_ROLE = 'MEMBER';
export const DEFAULT_COOLDOWN_SECONDS = 3;

export type SupportedCommandInteraction =
  | ChatInputCommandInteraction
  | UserContextMenuCommandInteraction
  | MessageContextMenuCommandInteraction;

export type SupportedDispatchInteraction = SupportedCommandInteraction | AutocompleteInteraction;

export interface CommandContext {
  correlationId: string;
  guildConfig: unknown;
  locale: string;
  rbacRole: string;
  logger: unknown;
  shardId: number;
  metadata: Map<string, unknown>;
}

export interface MiddlewareDeclaration {
  class: new (...args: never[]) => unknown;
  context?: Record<string, unknown>;
}

export type AutocompleteHandler = (
  interaction: AutocompleteInteraction | APIApplicationCommandAutocompleteInteraction,
  context: CommandContext,
) => Promise<void>;

export interface CommandLocalization {
  name: Record<string, string>;
  description: Record<string, string>;
}

export interface CommandPermissions {
  discord: bigint[];
  rbac: string;
}

export interface CommandCooldown {
  duration: number;
  scope: CooldownScope;
}

export interface ICommand {
  data: SlashCommandBuilder | ContextMenuCommandBuilder;
  execute: (interaction: SupportedCommandInteraction, context: CommandContext) => Promise<void>;
  permissions?: Partial<CommandPermissions>;
  defaultMemberPermissions?: bigint | undefined;
  cooldown?: Partial<CommandCooldown>;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  requiresDefer?: boolean | ((interaction: SupportedDispatchInteraction) => boolean);
  ephemeral?: boolean;
  nsfw?: boolean;
  middleware?: MiddlewareDeclaration[];
  autocomplete?: Record<string, AutocompleteHandler>;
  localization?: Partial<CommandLocalization>;
  forbidsPrefixBehavior?: boolean;
}

export interface NormalizedCommand {
  data: SlashCommandBuilder | ContextMenuCommandBuilder;
  execute: ICommand['execute'];
  permissions: CommandPermissions;
  defaultMemberPermissions?: bigint | undefined;
  cooldown: CommandCooldown;
  guildOnly: boolean;
  ownerOnly: boolean;
  requiresDefer: boolean | ((interaction: SupportedDispatchInteraction) => boolean);
  ephemeral: boolean;
  nsfw: boolean;
  middleware: MiddlewareDeclaration[];
  autocomplete: Record<string, AutocompleteHandler>;
  localization: CommandLocalization;
  forbidsPrefixBehavior: boolean;
}

export interface RegisteredCommandMetadata {
  commandKey: CommandKey;
  moduleSlug: string;
  tier: CommandTier;
  commandType: CommandType;
  identityId: IdentityId;
  guildOnly: boolean;
  ownerOnly: boolean;
  nsfw: boolean;
  defaultMemberPermissions?: bigint | undefined;
  localization: CommandLocalization;
  autocompleteOptionNames: string[];
  middleware: MiddlewareDeclaration[];
}

export interface RegisteredCommand {
  command: NormalizedCommand;
  metadata: RegisteredCommandMetadata;
}

export interface ModuleCommandDefinition {
  moduleSlug: string;
  tier: CommandTier;
  command: ICommand;
  identityId?: IdentityId;
}

export interface ModuleCommandSet {
  moduleSlug: string;
  tier: CommandTier;
  commands: ICommand[];
  enabled: boolean;
  version?: string;
  devGuildOnly?: boolean;
  marketplaceCategory?: string;
}

export interface DecodedCommandKey {
  type: CommandType;
  name: string;
  subcommandGroup?: string | undefined;
  subcommand?: string | undefined;
}

export interface CommandJson {
  key: CommandKey;
  moduleSlug: string;
  tier: CommandTier;
  identityId: IdentityId;
  scope?: DeploymentScope | undefined;
  guildId?: Snowflake | undefined;
  body: RESTPostAPIApplicationCommandsJSONBody;
}

export interface DeploymentTarget {
  identityId: IdentityId;
  scope: DeploymentScope;
  guildId?: Snowflake | undefined;
  commands: CommandJson[];
}

export interface DeploymentPlan {
  targets: DeploymentTarget[];
  rejected: DeploymentPlanningRejection[];
}

export interface DeploymentPlanningRejection {
  identityId: IdentityId;
  guildId?: Snowflake | undefined;
  projectedCount: number;
  reason: string;
}

export type GuildModuleStatus =
  | 'active'
  | 'disabled'
  | 'never_installed'
  | 'install_pending_resolution';

export type CommandChangeType =
  | 'module_disable_deletion'
  | 'rename'
  | 'alias_add'
  | 'alias_remove';

export type CommandChangeStatus =
  | 'pending'
  | 'scheduled'
  | 'pushing'
  | 'pushed'
  | 'failed'
  | 'invalidated';

export interface CommandChangeEntry {
  id: string;
  guildId: Snowflake;
  identityId: IdentityId | null;
  changeType: CommandChangeType;
  commandKey: CommandKey;
  moduleSlug: string;
  targetName: string | null;
  aliasName: string | null;
  status: CommandChangeStatus;
  batchAnchorT0: Date | null;
  scheduledPushAt: Date | null;
  outerCeilingAt: Date | null;
  projectionSnapshot: unknown | null;
  invalidatedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface ProjectionRequestChange {
  changeType: CommandChangeType;
  commandKey: CommandKey;
  moduleSlug: string;
  targetName?: string | undefined;
  aliasName?: string | undefined;
}

export interface CommandCountProjection {
  currentCount: number;
  projectedCount: number;
  wouldExceedCeiling: boolean;
  conflictingEntries: CommandChangeEntry[];
  reason: string;
}

export interface CommandCollision {
  id: string;
  guildId: Snowflake;
  identityId: IdentityId | null;
  commandKey: CommandKey;
  status: 'unresolved' | 'resolved' | 'auto_reassigned' | 'invalidated';
  selectedModuleSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CommandOverride {
  id: string;
  guildId: Snowflake;
  identityId: IdentityId | null;
  commandKey: CommandKey;
  winningModuleSlug: string;
  losingModuleSlug: string;
  collisionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CollisionCandidate {
  commandKey: CommandKey;
  moduleSlug: string;
}

export interface CollisionDetectionResult {
  hasCollision: boolean;
  collisions: Array<{
    commandKey: CommandKey;
    existingModuleSlug: string;
    newModuleSlug: string;
  }>;
}

export interface CommandDeploymentEnvironment {
  nodeEnv: 'development' | 'test' | 'production' | string;
  applicationId: string;
  devGuildId: string;
}

export interface HotSwapRequest {
  moduleSlug: string;
  actorId: string;
  reason?: string | undefined;
}

export interface HotSwapResult {
  ok: boolean;
  previousRegistrySize: number;
  newRegistrySize: number;
  error?: unknown | undefined;
}

export function isSubcommandOption(
  option: APIApplicationCommandOption,
): option is APIApplicationCommandSubcommandOption {
  return option.type === 1;
}

export function isSubcommandGroupOption(
  option: APIApplicationCommandOption,
): option is APIApplicationCommandSubcommandGroupOption {
  return option.type === 2;
}

export function discordTypeToCommandType(type: ApplicationCommandType | number): CommandType {
  if (type === 1) return 'CHAT_INPUT';
  if (type === 2) return 'USER_CONTEXT_MENU';
  if (type === 3) return 'MESSAGE_CONTEXT_MENU';
  throw new Error(`Unsupported Discord application command type: ${String(type)}`);
}
