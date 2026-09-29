import type { CommandRegistry } from './command-registry.js';
import type { CommandDefinition } from './command-registry.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleTier } from '../module-system/tier-rules.js';
import { MiddlewarePipeline, type PipelineResult } from '../middleware/middleware-pipeline.js';
import type { MiddlewareContext } from '../middleware/base-middleware.js';
import type { PermissionResolver } from '../permissions/resolver.js';
import type { RbacGrant } from '../permissions/rbac.js';
import {
  CoreRenderer,
  FOLLOWUP_ALARM_MS,
  type NoticeReasonCode,
  type RenderIdentity,
} from '../rendering/core-renderer.js';
import { PersonaOccupiedError } from '../personas/persona.js';

export interface CommandInteraction {
  commandName: string;
  user: { id: string };
  guildId: string | null;
  reply: (options: unknown) => Promise<void>;
  deferReply: (options?: { ephemeral?: boolean }) => Promise<void>;
  editReply: (options: unknown) => Promise<void>;
  replied?: boolean;
  deferred?: boolean;
  channel?: { id: string; categoryId: string | null; isNsfw: boolean };
  memberPermissions?: readonly string[];
  memberRoles?: readonly string[];
  isGuildOwner?: boolean;
}

export class CommandNotFoundError extends Error {
  constructor(name: string) {
    super(`No handler registered for command "${name}"`);
    this.name = 'CommandNotFoundError';
  }
}

export class CommandScopeDeniedError extends Error {
  constructor(
    readonly commandName: string,
    readonly moduleId: string,
    readonly tier: ModuleTier | 'unresolved',
    readonly guildId: string | null,
  ) {
    super(
      `Command "${commandName}" from ${tier} module "${moduleId}" is not available in guild "${guildId ?? 'DM'}"`,
    );
    this.name = 'CommandScopeDeniedError';
  }
}

export interface CommandRouterOptions {
  devGuildId?: string;
  ackTimeoutMs?: number;
  followupAlarmMs?: number;
  isModuleEnabledInGuild?: (moduleId: string, guildId: string) => Promise<boolean>;
  middlewarePipeline?: MiddlewarePipeline;
  permissionResolver?: PermissionResolver;
  botOwnerIds?: readonly string[];
  guildGrants?: readonly RbacGrant[];
  renderer?: CoreRenderer;
  resolveCommandOwner?: (guildId: string, moduleSlug: string) => Promise<string | undefined>;
  residentPersonaId?: string;
}

export class CommandRouter {
  private readonly devGuildId: string;
  private readonly followupAlarmMs: number;
  private readonly middlewarePipeline: MiddlewarePipeline;
  private readonly renderer: CoreRenderer;

  constructor(
    private readonly registry: CommandRegistry,
    private readonly logger: Logger,
    private readonly options: CommandRouterOptions = {},
  ) {
    this.devGuildId = options.devGuildId ?? '';
    this.followupAlarmMs = options.followupAlarmMs ?? options.ackTimeoutMs ?? FOLLOWUP_ALARM_MS;
    this.middlewarePipeline = options.middlewarePipeline ?? new MiddlewarePipeline();
    this.renderer = options.renderer ?? new CoreRenderer();
  }

  async dispatch(interaction: CommandInteraction): Promise<void> {
    const name = interaction.commandName;
    const identity = { surface: this.surfaceName(name) };

    if (interaction.guildId === null) {
      this.logger.warn('dm-interaction-rejected', { command: name, userId: interaction.user.id });
      throw new CommandScopeDeniedError(name, 'main-bot', 'core', null);
    }

    const traceId = this.renderer.createTraceId();
    await this.renderer.sendBuffer(interaction, identity);

    const def = this.registry.get(name);
    if (!def) {
      this.logger.warn('command-not-found', { command: name, userId: interaction.user.id });
      await this.renderer.editNotice(interaction, {
        ...identity,
        reason: 'UNKNOWN_COMMAND',
        traceId,
      });
      return;
    }

    const start = Date.now();
    const watchdog = this.armFollowupWatchdog(interaction, identity, traceId);

    try {
      await this.assertCommandInScope(def, interaction.guildId);
      this.assertPermissionAllowed(def, interaction);
      await this.assertPersonaOwnsCommand(def, interaction.guildId);

      let declaredResponse: unknown;
      const result = await this.middlewarePipeline.execute(
        this.createMiddlewareContext(interaction),
        async () => {
          declaredResponse = await def.execute(
            this.renderer.createReadOnlyInteraction(interaction),
          );
        },
      );

      const pipelinePassed = await this.handlePipelineResult(
        result,
        interaction,
        identity,
        traceId,
      );
      if (!pipelinePassed) return;

      const render = this.renderer.normalizeHandlerResult(declaredResponse, identity);
      await this.renderer.editFinal(interaction, render);
      this.logger.info('command-executed', {
        command: name,
        moduleId: def.moduleId,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      this.logger.error('command-execution-error', {
        command: name,
        moduleId: def.moduleId,
        userId: interaction.user.id,
        error: String(err),
      });
      await this.renderer.editNotice(interaction, {
        ...identity,
        reason: this.renderer.noticeReasonFromError(err),
        traceId,
      });
    } finally {
      clearTimeout(watchdog);
    }
  }

  private assertPermissionAllowed(
    command: CommandDefinition,
    interaction: CommandInteraction,
  ): void {
    const result = this.options.permissionResolver?.resolve({
      tier: this.requireModuleTier(command, interaction.guildId),
      actorId: interaction.user.id,
      botOwnerIds: this.options.botOwnerIds ?? [],
      isDM: interaction.guildId === null,
      allowedInDM: false,
      guildId: interaction.guildId,
      blacklist: {
        isGloballyBlacklisted: () => false,
        isGuildBlacklisted: () => false,
      },
      availability: {
        guildKnown: interaction.guildId !== null,
        moduleActive: true,
      },
      botPermissions: [],
      requiredBotPermissions: [],
      memberPermissions: interaction.memberPermissions ?? [],
      requiredMemberPermissions: command.permissions?.discord ?? [],
      rankInput: {
        isGuildOwner: interaction.isGuildOwner ?? false,
        restricted: false,
      },
      requiredRank: command.permissions?.rbac ?? null,
      grants: {
        commandKey: `${command.moduleId}.${command.data.name}`,
        membership: {
          roleIds: interaction.memberRoles ?? [],
          groupIds: [],
          setIds: [],
        },
        guildGrants: this.options.guildGrants ?? [],
      },
      hasExplicitPermissionDeclaration: command.permissionDeclared === true,
      channel: interaction.channel ?? { id: 'unknown', categoryId: null, isNsfw: false },
      requiresNsfw: command.permissions?.nsfw ?? false,
      channelLocks: {},
    });

    if (result && !result.allowed) {
      throw new CommandScopeDeniedError(
        command.data.name,
        command.moduleId,
        this.requireModuleTier(command, interaction.guildId),
        interaction.guildId,
      );
    }
  }

  private createMiddlewareContext(interaction: CommandInteraction): MiddlewareContext {
    return {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      commandName: interaction.commandName,
      correlationId: null,
      meta: {},
    };
  }

  private async handlePipelineResult(
    result: PipelineResult,
    interaction: CommandInteraction,
    identity: RenderIdentity,
    traceId: string,
  ): Promise<boolean> {
    if (result.ok) return true;

    if (result.rejection) {
      this.logger.warn('command-middleware-rejected', {
        command: interaction.commandName,
        userId: interaction.user.id,
        ...(interaction.guildId !== null ? { guildId: interaction.guildId } : {}),
        statusCode: result.rejection.statusCode,
        reason: result.rejection.reason,
      });
      await this.renderer.editNotice(interaction, {
        ...identity,
        reason: this.reasonFromRejection(result.rejection.reason),
        traceId,
        explanation: result.rejection.reason,
      });
      return false;
    }

    throw result.error;
  }

  private requireModuleTier(command: CommandDefinition, guildId: string | null): ModuleTier {
    const tier = this.registry.tierForCommand(command);
    if (tier === undefined) {
      this.logger.error('command-tier-unresolved', {
        command: command.data.name,
        moduleId: command.moduleId,
        guildId: guildId ?? 'DM',
      });
      throw new CommandScopeDeniedError(command.data.name, command.moduleId, 'unresolved', guildId);
    }
    return tier;
  }

  private async assertCommandInScope(
    command: CommandDefinition,
    guildId: string | null,
  ): Promise<void> {
    const tier = this.requireModuleTier(command, guildId);
    const guildOnly = command.guildOnly ?? true;

    if (guildOnly && !guildId) {
      throw new CommandScopeDeniedError(command.data.name, command.moduleId, tier, guildId);
    }

    if (tier === 'admin') {
      if (guildId !== this.devGuildId) {
        throw new CommandScopeDeniedError(command.data.name, command.moduleId, tier, guildId);
      }
      return;
    }

    if (tier === 'core') return;

    if (!guildId) {
      throw new CommandScopeDeniedError(command.data.name, command.moduleId, tier, guildId);
    }

    if (!this.options.isModuleEnabledInGuild) return;

    const enabled = await this.options.isModuleEnabledInGuild(command.moduleId, guildId);
    if (!enabled) {
      throw new CommandScopeDeniedError(command.data.name, command.moduleId, tier, guildId);
    }
  }

  private async assertPersonaOwnsCommand(
    command: CommandDefinition,
    guildId: string | null,
  ): Promise<void> {
    if (guildId === null) return;
    if (this.options.resolveCommandOwner === undefined) return;
    const owner = await this.options.resolveCommandOwner(guildId, command.moduleId);
    if (owner === undefined) return;
    if (owner === this.options.residentPersonaId) return;
    throw new PersonaOccupiedError(guildId, command.moduleId, owner);
  }

  private armFollowupWatchdog(
    interaction: CommandInteraction,
    identity: RenderIdentity,
    traceId: string,
  ): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      void this.renderer
        .editNotice(interaction, { ...identity, reason: 'OVERDUE', traceId })
        .then(() => {
          this.logger.warn('command-followup-watchdog-fired', {
            command: interaction.commandName,
            traceId,
          });
        })
        .catch((err) => {
          this.logger.error('command-followup-watchdog-failed', {
            command: interaction.commandName,
            traceId,
            error: String(err),
          });
        });
    }, this.followupAlarmMs);
  }

  private reasonFromRejection(reason: string): NoticeReasonCode {
    const normalized = reason.toLowerCase();
    if (normalized.includes('maintenance')) return 'MAINTENANCE';
    if (normalized.includes('rate')) return 'RATE_LIMITED';
    if (normalized.includes('cooldown')) return 'COOLDOWN';
    return 'FORBIDDEN';
  }

  private surfaceName(commandName: string): string {
    return commandName
      .split(/[-_.\s]+/u)
      .filter((part) => part.length > 0)
      .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
      .join(' ');
  }
}
