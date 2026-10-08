import type { CommandRegistry } from './command-registry.js';
import type { CommandDefinition } from './command-registry.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleTier } from '../module-system/tier-rules.js';
import { MiddlewarePipeline, type PipelineResult } from '../middleware/middleware-pipeline.js';
import type { MiddlewareContext } from '../middleware/base-middleware.js';
import type { PermissionResolver } from '../permissions/resolver.js';
import type { RbacGrant } from '../permissions/rbac.js';
import { type GuildSuspensionStore } from '../governance/guild-suspension.js';
import {
  CoreRenderer,
  FOLLOWUP_ALARM_MS,
  type ModeControl,
  type NavigationControl,
  type NavigationOption,
  type NoticeReasonCode,
  type PageActionRow,
  type RenderIdentity,
  type RenderMode,
  derivePageSections,
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
  /** §6.7 — the interaction's option accessor, so a handler can read its own arguments. */
  options?: unknown;
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
  /** §21 Layer 7 — loads a guild's grants at dispatch time (the runtime grant writer). */
  grantStore?: { list(guildId: string): Promise<readonly RbacGrant[]> };
  renderer?: CoreRenderer;
  resolveCommandOwner?: (guildId: string, moduleSlug: string) => Promise<string | undefined>;
  residentPersonaId?: string;
  /**
   * blueprint.md §22.2 / Table 22-A — the Power Engine `suspendGuild` state. When present, dispatch
   * consults it before anything else in the guild: a suspension overrides the guild's own
   * configuration rather than editing it.
   */
  guildSuspensions?: GuildSuspensionStore;
  /**
   * §1.7 — supplies a module's page data at dispatch. Modules cannot reach the host process, so
   * anything a page reports about the running system (metrics, queue state, personas) is gathered
   * here and handed to the handler as `context.data`.
   */
  pageDataProvider?: (
    moduleId: string,
    guildId: string | null,
  ) => Promise<Readonly<Record<string, unknown>>>;
  /**
   * §6.7 — performs the side effects a handler declares. Keyed by effect kind; an undeclared kind
   * is ignored rather than failing the interaction.
   */
  effectHandlers?: Readonly<
    Record<
      string,
      (payload: Readonly<Record<string, unknown>>, interaction: CommandInteraction) => Promise<void>
    >
  >;
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

  async dispatch(
    interaction: CommandInteraction,
    options: { mode?: RenderMode } = {},
  ): Promise<void> {
    const name = interaction.commandName;
    const identity: RenderIdentity = { surface: this.pageTitle(name) };

    if (interaction.guildId === null) {
      this.logger.warn('dm-interaction-rejected', { command: name, userId: interaction.user.id });
      throw new CommandScopeDeniedError(name, 'main-bot', 'core', null);
    }

    const traceId = this.renderer.createTraceId();
    await this.renderer.sendBuffer(interaction, identity);

    // §22.2 / Table 22-A: a suspended guild blocks dispatch fleet-wide, ahead of the guild's own
    // configuration and ahead of the middleware pipeline — the broadest of the four primitives.
    // Rendered inline like the not-found case, so the user sees the formal notice rather than a
    // buffer that never resolves.
    if (this.options.guildSuspensions !== undefined) {
      const guildId = interaction.guildId;
      if (await this.options.guildSuspensions.isSuspended(guildId)) {
        this.logger.warn('guild-suspended-dispatch-blocked', {
          command: name,
          guildId,
          userId: interaction.user.id,
        });
        await this.renderer.editNotice(interaction, {
          ...identity,
          reason: 'GUILD_UNAVAILABLE',
          traceId,
        });
        return;
      }
    }

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
      await this.assertPermissionAllowed(def, interaction);
      await this.assertPersonaOwnsCommand(def, interaction.guildId);

      let declaredResponse: unknown;
      const result = await this.middlewarePipeline.execute(
        this.createMiddlewareContext(interaction),
        async () => {
          declaredResponse = await def.execute(
            this.renderer.createReadOnlyInteraction(interaction),
            {
              config: def.moduleConfig ?? {},
              data: (await this.options.pageDataProvider?.(def.moduleId, interaction.guildId)) ?? {},
            },
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

      // §6.7 — the handler declares its side effects; the host performs them. They run before the
      // render so a rejected effect surfaces as a formal notice rather than a stale page.
      const effects =
        (
          declaredResponse as {
            effects?: readonly {
              kind: string;
              payload: Readonly<Record<string, unknown>>;
            }[];
          }
        ).effects ?? [];
      for (const effect of effects) {
        const effectHandler = this.options.effectHandlers?.[effect.kind];
        if (effectHandler === undefined) {
          // A declared effect with no handler is a wiring bug, not a handler bug: say so loudly
          // rather than dropping the action silently, which is indistinguishable from success.
          this.logger.warn('command-effect-unhandled', { command: name, kind: effect.kind });
          continue;
        }
        this.logger.info('command-effect-running', { command: name, kind: effect.kind });
        await effectHandler(effect.payload, interaction);
      }

      // item 4 / ADR-013 — density is a per-page declaration; a page's density wins.
      const declaredDensityRaw = (declaredResponse as { data?: { density?: unknown } } | null)?.data
        ?.density;
      const declaredPageData = (declaredResponse as { data?: Readonly<Record<string, unknown>> } | null)
        ?.data;
      const declaredDensity =
        declaredDensityRaw === 'D' || declaredDensityRaw === 'M' || declaredDensityRaw === 'C'
          ? declaredDensityRaw
          : undefined;
      const render = this.renderer.normalizeHandlerResult(declaredResponse, {
        ...identity,
        moduleId: def.moduleId,
        ...(def.identity?.developer !== undefined ? { developer: def.identity.developer } : {}),
        ...(def.identity?.displayName !== undefined ? { displayName: def.identity.displayName } : {}),
        ...(def.identity?.accent !== undefined ? { accent: def.identity.accent } : {}),
        ...(def.identity?.banner !== undefined ? { banner: def.identity.banner } : {}),
        ...(def.identity?.buildId !== undefined ? { buildId: def.identity.buildId } : {}),
        ...(def.identity?.devUsername !== undefined
          ? { devUsername: def.identity.devUsername }
          : {}),
        ...(options.mode !== undefined ? { mode: options.mode } : {}),
        ...(declaredDensity !== undefined ? { mode: declaredDensity } : {}),
        // items 10/11/15/17 - page-declared action controls; the dashboard's nav is Home/Next/Prev.
        ...(name === 'dashboard' || name === 'modules' || name === 'browse'
          ? { actions: this.pageActions(name, declaredPageData, interaction.user.id) }
          : {}),
      });
      // A page whose data the effects just changed is re-derived, so the render shows the result
      // of the action rather than the state it was gathered in.
      if (effects.length > 0) {
        const pageName = (declaredResponse as { page?: string }).page;
        if (pageName !== undefined) {
          const fresh =
            (await this.options.pageDataProvider?.(def.moduleId, interaction.guildId)) ?? {};
          render.sections = derivePageSections(pageName, fresh);
        }
      }

      await this.renderer.editFinal(interaction, render);
      this.logger.info('command-executed', {
        command: name,
        moduleId: def.moduleId,
        effectCount: effects.length,
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

  private async assertPermissionAllowed(
    command: CommandDefinition,
    interaction: CommandInteraction,
  ): Promise<void> {
    // Finding #25: Layer 7 grants are loaded from the runtime store at dispatch time, so a grant
    // written through the app takes effect without a restart. Falls back to the static list.
    const guildGrants =
      interaction.guildId !== null && this.options.grantStore !== undefined
        ? await this.options.grantStore.list(interaction.guildId)
        : (this.options.guildGrants ?? []);
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
        guildGrants,
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
      // Finding #17 — `DeferMiddleware` reads the interaction from the context; an empty `meta`
      // made the defer stage dead by construction.
      meta: { interaction },
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

  /** §3-§10 — a page's title is its division's name, which is not always its command name. */
  private pageTitle(commandName: string): string {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      health: 'Health',
      browse: 'Marketplace',
      queue: 'Queue',
      persona: 'Persona',
      permit: 'Permit',
      modules: 'Modules',
      hello: 'Hello World',
    };
    return titles[commandName] ?? this.surfaceName(commandName);
  }

  /**
   * §11.3 — Dashboard (Home) first, then every registered page. The installed/marketplace prefix
   * lives in the option description only (§11.4), truncated to Discord's 100-character limit.
   */
  private navigationControl(current: string, invokerId: string): NavigationControl {
    const commands = [...this.registry.all()].sort((a, b) =>
      a.data.name === 'dashboard' ? -1 : b.data.name === 'dashboard' ? 1 : 0,
    );
    const options: NavigationOption[] = commands.map((command) => {
      const name = command.data.name;
      const isHome = name === 'dashboard';
      const installed = this.registry.tierForCommand(command) !== 'marketplace';
      const description = isHome
        ? '🏠 Home'
        : `${installed ? '✅ installed' : '🛒 marketplace'} — ${command.data.description}`;
      return {
        label: isHome ? 'Dashboard (Home)' : this.pageTitle(name),
        value: name,
        description: description.slice(0, 100),
        ...(name === current ? { default: true } : {}),
      };
    });
    return { customId: `dumby:nav:${invokerId}:${current}`, options };
  }

  /**
   * items 11/15/17 - the page-declared action controls. /modules carries a per-module info +
   * uninstall pair and a paging row; /browse carries a search control and a per-module info
   * control. Every customId is minted `dumby:act:<invoker>:<action>:<target>` so the interaction
   * registry's invoker re-check holds.
   */
  private pageActions(
    commandName: string,
    data: Readonly<Record<string, unknown>> | undefined,
    invokerId: string,
  ): readonly PageActionRow[] {
    const raw = Array.isArray(data?.['modules']) ? (data['modules'] as unknown[]) : [];
    const ids = raw
      .map((m) => (typeof m === 'object' && m !== null ? (m as { id?: unknown }).id : undefined))
      .filter((id): id is string => typeof id === 'string');
    const rows: PageActionRow[] = [];
    const mint = (action: string, target: string): string =>
      `dumby:act:${invokerId}:${action}:${target}`;

    // item 10 - the dashboard's navigation is Home (icon-only) / Next page / Previous page.
    if (commandName === 'dashboard') {
      const nav = (target: string): string => `dumby:nav:${invokerId}:${target}`;
      return [
        [
          { customId: nav('dashboard'), label: '⌂', style: 2 },
          { customId: nav('next'), label: 'next page', style: 2 },
          { customId: nav('prev'), label: 'previous page', style: 2 },
        ],
      ];
    }

    if (commandName === 'modules') {
      for (const id of ids) {
        rows.push([
          { customId: mint('info', id), label: 'info', style: 2 },
          { customId: mint('uninstall', id), label: 'uninstall/disable', style: 4 },
        ]);
      }
      rows.push([
        { customId: mint('next', 'modules'), label: 'next page', style: 2 },
        { customId: mint('prev', 'modules'), label: 'previous page', style: 2 },
        { customId: mint('first', 'modules'), label: 'first page', style: 2 },
      ]);
    } else if (commandName === 'browse') {
      rows.push([{ customId: mint('search', 'browse'), label: '🔍 search', style: 2 }]);
      for (const id of ids) {
        rows.push([{ customId: mint('info', id), label: `info: ${id}`, style: 2 }]);
      }
    }
    return rows;
  }

  /** §1.2 — one minted customId per density mode, each carrying the page it applies to. */
  private modeControl(current: string, invokerId: string): ModeControl {
    return {
      customIds: {
        D: `dumby:mode:${invokerId}:D:${current}`,
        M: `dumby:mode:${invokerId}:M:${current}`,
        C: `dumby:mode:${invokerId}:C:${current}`,
      },
    };
  }

  private surfaceName(commandName: string): string {
    return commandName
      .split(/[-_.\s]+/u)
      .filter((part) => part.length > 0)
      .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
      .join(' ');
  }
}
