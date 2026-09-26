import 'dotenv/config';
import { Container } from '../di/container.js';
import { CORE_TOKENS } from '../di/tokens.js';
import { parseEnv, pickEnvKeys, ConfigValidationError } from '../config/env.schema.js';
import { ConfigService } from '../config/config.service.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { MetricsRegistry } from '../metrics/registry.js';
import { DbClient } from '../db/client.js';
import { InternalEventBus } from '../events/event-bus.js';
import { CacheManager } from '../cache/cache-manager.js';
import { RedisLockStore } from '../cache/redis-lock-store.js';
import { QueueManager } from '../queue/queue-manager.js';
import { ModuleRegistry } from '../module-system/registry.js';
import { ModuleLoader } from '../module-system/loader.js';
import { defaultEnabledForTier } from '../module-system/tier-rules.js';
import { PermissionResolver } from '../permissions/resolver.js';
import { BootstrapProgress } from './stages.js';
import { buildApiServer, buildHealthServer, buildMetricsServer } from '../http/server.js';
import { PowerEngineDispatcher } from '../http/power-engine-dispatcher.js';
import { loadModulesFromTierVolumes } from '../module-system/swastik-loader.js';
import { InFlightTracker } from '../shutdown/in-flight-tracker.js';
import {
  registerShutdownSignalHandlers,
  isAcceptingGatewayEvents,
  gracefulShutdown,
} from '../shutdown/shutdown.js';
import { installFatalHandlers } from '../shutdown/fatal-handler.js';
import { Redis } from 'ioredis';
import { CommandRegistry } from '../commands/command-registry.js';
import { CommandRouter } from '../commands/command-router.js';
import type { CommandInteraction } from '../commands/command-router.js';
import { PersonaCommandBindingService } from '../personas/persona-command-binding.service.js';
import {
  PostgresPersonaBindingStore,
  PostgresPersonaIdentityStore,
} from '../personas/persona.repository.js';
import { MiddlewarePipeline } from '../middleware/middleware-pipeline.js';
import { TraceMiddleware } from '../middleware/built-in/trace.js';
import { AnalyticsMiddleware } from '../middleware/built-in/analytics.js';
import {
  MaintenanceModeMiddleware,
  InMemoryMaintenanceModeState,
} from '../middleware/built-in/maintenance-mode.js';
import { AdminTierGateMiddleware } from '../middleware/built-in/admin-tier-gate.js';
import { AuthMiddleware } from '../middleware/built-in/auth.js';
import { LocaleMiddleware, DefaultLocaleResolver } from '../middleware/built-in/locale.js';
import { GuildConfigMiddleware } from '../middleware/built-in/guild-config.js';
import { CooldownMiddleware, InMemoryCooldownStore } from '../middleware/built-in/cooldown.js';
import { RateLimitMiddleware } from '../middleware/built-in/rate-limit.js';
import { PermissionMiddleware } from '../middleware/built-in/permission.js';
import { RBACMiddleware } from '../middleware/built-in/rbac.js';
import { DeferMiddleware } from '../middleware/built-in/defer.js';
import { SlidingWindowRateLimiter } from '../ratelimit/sliding-window.js';
import { GuildConfigService } from '../config/guild-config.service.js';
import { Events, REST, type Client } from 'discord.js';
import {
  buildDiscordClient,
  computeIntentsBitfield,
  computePartials,
} from '../discord/client-builder.js';
import { LiveGatewayAdapter } from '../discord/gateway.live-adapter.js';
import { CommandDeployer } from '../commands/command-deployer.js';
import { CoreRenderer } from '../rendering/core-renderer.js';
import { InteractionRegistry } from '../interactions/interaction-registry.js';

/**
 * The 18-stage bootstrap sequence (Cluster: Grace). Each numbered comment
 * below is one stage; `progress.advanceTo(...)` is what the three health
 * probes read (src/bootstrap/stages.ts — already unit tested).
 */
export async function bootstrap(): Promise<void> {
  const progress = new BootstrapProgress();
  const container = new Container();

  // Stage 01: PROCESS_SETUP
  progress.advanceTo('PROCESS_SETUP');
  process.title = 'dumby-headless-backend';
  // Fatal handlers (UR-C-18): structured fatal log with correlation ID, then
  // `system.fatal-error` notification and a graceful shutdown bounded to 15s,
  // then exit 1. The logger/shutdown/notifiers are upgraded in place once the
  // later stages construct them.
  const fatalHooks: {
    logger: Logger;
    shutdown?: () => Promise<void>;
    notify?: (correlationId: string, error: unknown) => void;
  } = { logger: createLogger('warn') };
  const uninstallFatalHandlers = installFatalHandlers(fatalHooks);
  void uninstallFatalHandlers;

  // Stage 02: CONFIG_LOAD
  progress.advanceTo('CONFIG_LOAD');
  let env;
  try {
    env = parseEnv(pickEnvKeys(process.env));
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      fatalHooks.logger.fatal('environment-validation-failed', { fieldErrors: err.fieldErrors });
      process.exit(1);
    }
    throw err;
  }
  const config = new ConfigService(env);
  container.registerValue(CORE_TOKENS.Config, config);

  // Stage 03: HEALTH_SERVER_INIT — must be listening before Stage 04 so
  // liveness can start returning 200 as soon as Stage 04 completes.
  progress.advanceTo('HEALTH_SERVER_INIT');
  const healthServer = buildHealthServer(progress);
  await healthServer.listen({ port: config.get('HEALTH_PORT'), host: '0.0.0.0' });

  // Stage 04: OBSERVABILITY_INIT
  progress.advanceTo('OBSERVABILITY_INIT');
  const logger = createLogger(config.get('LOG_LEVEL'));
  fatalHooks.logger = logger;
  const metrics = new MetricsRegistry();
  container.registerValue(CORE_TOKENS.Logger, logger);
  container.registerValue(CORE_TOKENS.Metrics, metrics);
  const metricsServer = buildMetricsServer(metrics);
  await metricsServer.listen({ port: config.get('METRICS_PORT'), host: '0.0.0.0' });

  // Stage 05: DATABASE_CONNECT
  progress.advanceTo('DATABASE_CONNECT');
  const db = new DbClient({
    connectionString: config.get('DATABASE_URL'),
    poolMax: config.get('DATABASE_POOL_MAX'),
    statementTimeoutMs: config.get('DATABASE_STATEMENT_TIMEOUT_MS'),
    slowQueryThresholdMs: config.get('SLOW_QUERY_THRESHOLD_MS'),
    criticalQueryThresholdMs: config.get('CRITICAL_QUERY_THRESHOLD_MS'),
    logger,
  });
  container.registerValue(CORE_TOKENS.Db, db);

  // Stage 06: MIGRATION_RUN
  progress.advanceTo('MIGRATION_RUN');
  await db.knex.migrate.latest();

  // Stage 07: CACHE_CONNECT
  progress.advanceTo('CACHE_CONNECT');
  const redis = new Redis(config.get('REDIS_URL'));
  const lockStore = new RedisLockStore(redis);
  const cache = new CacheManager({
    redis,
    lockStore,
    logger,
    l1MaxEntries: config.get('CACHE_L1_MAX_ENTRIES'),
    l1MaxBytes: config.get('CACHE_L1_MAX_BYTES'),
  });
  container.registerValue(CORE_TOKENS.Cache, cache);

  // Stage 08: QUEUE_INIT
  progress.advanceTo('QUEUE_INIT');
  const queueRedis = new Redis(config.get('QUEUE_REDIS_URL'));
  const queue = new QueueManager({
    connection: queueRedis,
    logger,
    defaultConcurrency: config.get('QUEUE_CONCURRENCY_DEFAULT'),
  });
  container.registerValue(CORE_TOKENS.Queue, queue);

  // Stage 09: DI_BOOTSTRAP — register remaining core services, then freeze.
  progress.advanceTo('DI_BOOTSTRAP');
  const eventBus = new InternalEventBus({ maxEmitDepth: config.get('EVENT_BUS_MAX_EMIT_DEPTH') });
  fatalHooks.notify = (correlationId, error) => {
    try {
      void eventBus.emit('dumby.system.fatal', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // The fatal path must never throw while reporting its own fatal.
    }
  };
  const moduleRegistry = new ModuleRegistry();
  const permissionResolver = new PermissionResolver();
  const commandRegistry = new CommandRegistry();
  const renderer = new CoreRenderer();
  const interactionRegistry = new InteractionRegistry({
    acknowledge: async (component) => {
      if (typeof component.deferUpdate === 'function') {
        await component.deferUpdate();
        return;
      }
      if (typeof component.deferReply === 'function') {
        await component.deferReply({ ephemeral: false });
      }
    },
  });

  // Command middleware sources resolve lazily against the registry, which is
  // populated only during Stage 12 (MODULE_LOAD). Everything here runs once
  // per dispatch, not at bootstrap time.
  const isAdminTierCommand = (name: string) => {
    const def = commandRegistry.get(name);
    return def !== undefined && commandRegistry.getModuleTier(def.moduleId) === 'admin';
  };
  const isCoreTierCommand = (name: string) => {
    const def = commandRegistry.get(name);
    return def !== undefined && commandRegistry.getModuleTier(def.moduleId) === 'core';
  };

  // Persona (Twixter) wiring (§18.5.1): the binding service is constructed at
  // bootstrap alongside the personal stores and registered in DI so it is never
  // zero-caller. Persona identities load per persona process against PERSONA_ID.
  const personaBindingService = new PersonaCommandBindingService(
    new PostgresPersonaIdentityStore(db.knex),
    new PostgresPersonaBindingStore(db.knex),
    logger,
  );

  const guildConfigService = new GuildConfigService(db, cache, logger);
  const maintenanceMode = new InMemoryMaintenanceModeState();

  const commandMiddleware = new MiddlewarePipeline()
    .add(new TraceMiddleware())
    .add(
      new MaintenanceModeMiddleware({
        isActive: () => maintenanceMode.isActive(),
        allowedCommands: () => maintenanceMode.allowedCommands(),
      }),
    )
    .add(
      new AdminTierGateMiddleware(
        {
          botOwnerIds: config.get('BOT_OWNER_IDS'),
          isAdminTierCommand,
        },
        logger,
      ),
    )
    .add(
      new AuthMiddleware({ isGuildOnly: (name) => commandRegistry.get(name)?.guildOnly ?? true }),
    )
    .add(new LocaleMiddleware(new DefaultLocaleResolver('en-US')))
    .add(
      new GuildConfigMiddleware(
        {
          load: async (guildId: string): Promise<Record<string, unknown>> =>
            guildConfigService.get(guildId),
        },
        logger,
      ),
    )
    .add(
      new RateLimitMiddleware(
        new SlidingWindowRateLimiter(
          config.get('RATE_LIMIT_USER_MAX'),
          config.get('RATE_LIMIT_USER_WINDOW_MS'),
        ),
        {
          userMax: config.get('RATE_LIMIT_USER_MAX'),
          userWindowMs: config.get('RATE_LIMIT_USER_WINDOW_MS'),
          guildMax: config.get('RATE_LIMIT_GUILD_MAX'),
          guildWindowMs: config.get('RATE_LIMIT_GUILD_WINDOW_MS'),
        },
      ),
    )
    .add(
      new PermissionMiddleware({
        getMemberPermissions: async () => [],
        getRequiredPermissions: () => [],
      }),
    )
    .add(
      new RBACMiddleware({
        getHighestRole: async () => null,
        getRequiredRole: () => null,
        isCoreTierCommand,
      }),
    )
    .add(
      new CooldownMiddleware(new InMemoryCooldownStore(), {
        getCooldownMs: () => 0,
      }),
    )
    .add(
      new DeferMiddleware({
        requiresDefer: () => false,
        isEphemeral: () => false,
      }),
    )
    .add(new AnalyticsMiddleware(logger));
  const isModuleEnabledInGuild = async (moduleId: string, guildId: string): Promise<boolean> => {
    const row = await db
      .knex('guild_module_states')
      .where({ guildId, moduleSlug: moduleId })
      .whereNull('deletedAt')
      .first<{ enabled: boolean; state: string }>();

    // No row yet → tier default (change-log v4.1.0). Standard+ is active by
    // default; the first interaction backfills a row so the admin surface
    // sees a concrete state instead of an implicit gap.
    if (row === undefined) {
      const tier = moduleRegistry.get(moduleId)?.manifest.tier ?? 'marketplace';
      const enabled = defaultEnabledForTier(tier);
      if (enabled) {
        await db
          .knex('guild_module_states')
          .insert({ guildId, moduleSlug: moduleId, enabled: true, state: 'active' })
          .onConflict(['guildId', 'moduleSlug'])
          .ignore();
      }
      return enabled;
    }

    // An explicit row is authoritative: enabled + active means on; anything
    // else (explicit disable, interrupted install, degraded) means off.
    return row.enabled === true && row.state === 'active';
  };
  const commandRouter = new CommandRouter(commandRegistry, logger, {
    devGuildId: config.get('DEV_GUILD_ID'),
    isModuleEnabledInGuild,
    permissionResolver,
    botOwnerIds: config.get('BOT_OWNER_IDS'),
    middlewarePipeline: commandMiddleware,
    renderer,
    resolveCommandOwner: (guildId, moduleSlug) =>
      personaBindingService.resolveCommandOwner(guildId, moduleSlug),
    ...(config.get('PERSONA_ID') !== '' ? { residentPersonaId: config.get('PERSONA_ID') } : {}),
  });
  container.registerValue(CORE_TOKENS.EventBus, eventBus);
  container.registerValue(CORE_TOKENS.ModuleRegistry, moduleRegistry);
  container.registerValue(CORE_TOKENS.PermissionResolver, permissionResolver);
  container.registerValue(CORE_TOKENS.CommandRegistry, commandRegistry);
  container.registerValue(CORE_TOKENS.CommandRouter, commandRouter);
  container.registerValue(CORE_TOKENS.Renderer, renderer);
  container.registerValue(CORE_TOKENS.InteractionRegistry, interactionRegistry);
  container.registerValue(CORE_TOKENS.Personas, personaBindingService);
  container.freeze();

  // Modules load against a child of the frozen root container: they can
  // resolve any CORE_TOKENS service through the parent chain, and freely
  // register their own module.<name>.* tokens (di-container.test.ts:
  // "freezing a parent does not freeze children") without ever being able
  // to overwrite a CORE_TOKENS entry on the frozen root itself.
  const moduleContainer = container.createChild();

  // Stage 10: MODULE_DISCOVER
  progress.advanceTo('MODULE_DISCOVER');
  const discoveredModules = await loadModulesFromTierVolumes({
    modulesDir: config.get('MODULES_DIR'),
    registry: moduleRegistry,
    logger,
  });
  logger.info('module-discovery-complete', {
    source: 'tier-volumes',
    modulesDir: config.get('MODULES_DIR'),
    modules: discoveredModules.loaded,
  });

  // Stage 11: MODULE_VALIDATE
  progress.advanceTo('MODULE_VALIDATE');
  const moduleLoader = new ModuleLoader(moduleRegistry, moduleContainer, logger);
  moduleLoader.validateAll();

  // Stage 12: MODULE_LOAD
  progress.advanceTo('MODULE_LOAD');
  const loadReport = await moduleLoader.loadAll();

  // Stage 13: COMMAND_REGISTER
  // Modules registered their command handlers in onLoad (Stage 12).
  // Log the inventory; actual Discord API bulk-registration happens in the
  // live adapter path (src/discord/client-builder.ts + main.ts).
  progress.advanceTo('COMMAND_REGISTER');
  logger.info('command-registry-ready', { commandCount: commandRegistry.count() });

  // Stage 14: EVENT_REGISTER
  progress.advanceTo('EVENT_REGISTER');
  // Domain event subscriptions are wired inside each module's onLoad; nothing
  // additional to register centrally in V1.

  // Stage 15: DISCORD_LOGIN — live: real client.login(BOT_TOKEN); mock: MockGatewayAdapter
  // never opens a real socket (see src/discord/gateway.mock-adapter.ts).
  progress.advanceTo('DISCORD_LOGIN');
  let discordClient: Client | undefined;
  if (config.get('DISCORD_ADAPTER') === 'live') {
    const modules = moduleRegistry.all();
    const intents = computeIntentsBitfield(modules.map((m) => m.manifest.intents));
    const partials = computePartials(modules.map((m) => m.manifest.partials));
    discordClient = buildDiscordClient({ intents, partials, logger });

    discordClient.on(Events.InteractionCreate, async (interaction) => {
      if (!isAcceptingGatewayEvents()) return;

      if (interaction.isChatInputCommand()) {
        const channel = (
          interaction as unknown as {
            channel?: { id: string; parentId?: string | null; isNSFW?: () => boolean } | null;
          }
        ).channel;
        const member = (
          interaction as unknown as {
            member?: {
              permissions?: { has: (p: string) => boolean };
              roles?: { cache?: { keys: () => IterableIterator<string> } };
            } | null;
          }
        ).member;
        const memberPermissions = member?.permissions
          ? [
              'Administrator',
              'ManageChannels',
              'ManageGuild',
              'ModerateMembers',
              'BanMembers',
              'KickMembers',
            ].filter((p) => member.permissions?.has(p) === true)
          : undefined;
        const commandInteraction: CommandInteraction = interaction as unknown as CommandInteraction;
        if (channel) {
          commandInteraction.channel = {
            id: channel.id,
            categoryId: channel.parentId ?? null,
            isNsfw: channel.isNSFW?.() ?? false,
          };
        }
        if (memberPermissions !== undefined) {
          commandInteraction.memberPermissions = memberPermissions;
        }
        if (member?.roles?.cache) {
          commandInteraction.memberRoles = [...member.roles.cache.keys()];
        }
        void commandRouter.dispatch(commandInteraction).catch(async (err) => {
          logger.error('interaction-dispatch-failed', {
            command: interaction.commandName,
            error: String(err),
          });
        });
        return;
      }

      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        const componentInteraction = {
          id: interaction.id,
          customId: interaction.customId,
          user: { id: interaction.user.id },
          guildId: interaction.guildId,
          reply: interaction.reply.bind(interaction) as unknown as (
            options: unknown,
          ) => Promise<void>,
          deferReply: interaction.deferReply.bind(interaction) as unknown as (options?: {
            ephemeral?: boolean;
          }) => Promise<void>,
          editReply: interaction.editReply.bind(interaction) as unknown as (
            options: unknown,
          ) => Promise<void>,
          ...(interaction.deferUpdate !== undefined
            ? {
                deferUpdate: interaction.deferUpdate.bind(
                  interaction,
                ) as unknown as () => Promise<void>,
              }
            : {}),
        };
        const handled = await interactionRegistry.dispatch(componentInteraction);

        if (!handled) {
          logger.warn('unhandled-component-interaction', {
            customId: interaction.customId,
            userId: interaction.user.id,
          });
        }
        return;
      }
    });

    const liveAdapter = new LiveGatewayAdapter(
      discordClient,
      config.get('BOT_TOKEN'),
      config.get('SHARD_COUNT'),
    );
    await liveAdapter.login();
  }

  // Stage 16: CLIENT_READY
  progress.advanceTo('CLIENT_READY');
  if (discordClient) {
    const applicationId = discordClient.application?.id ?? '';
    const rest = new REST({ version: '10' }).setToken(config.get('BOT_TOKEN'));
    const commandDeployer = new CommandDeployer({
      registry: commandRegistry,
      logger,
      config: {
        botToken: config.get('BOT_TOKEN'),
        applicationId,
        devGuildId: config.get('DEV_GUILD_ID'),
        nodeEnv: config.get('NODE_ENV'),
      },
      rest,
      enabledGuildResolver: async (moduleSlug) => {
        // Match the router's defaulting: all guilds for default-enabled
        // tiers minus explicitly-disabled rows; explicit-active rows only
        // for Marketplace (opt-in).
        const tier = moduleRegistry.get(moduleSlug)?.manifest.tier ?? 'marketplace';
        const explicit = await db
          .knex('guild_module_states')
          .select<{ guildId: string }[]>('guildId')
          .where({ moduleSlug, enabled: true, state: 'active' })
          .whereNull('deletedAt');

        if (!defaultEnabledForTier(tier)) {
          return explicit.map((row) => row.guildId);
        }

        const disabledRows = await db
          .knex('guild_module_states')
          .select<{ guildId: string }[]>('guildId')
          .where({ moduleSlug })
          .where((builder) => builder.where('enabled', false).orWhereNot('state', 'active'))
          .whereNull('deletedAt');
        const disabled = new Set(disabledRows.map((row) => row.guildId));

        const allRows = await db.knex('guilds').select<{ id: string }[]>('id');
        return allRows.map((row) => row.id).filter((id) => !disabled.has(id));
      },
    });
    await commandDeployer.deploy();
    logger.info('discord-client-ready', {
      applicationId,
      guildCount: discordClient.guilds.cache.size,
    });
  }

  // Stage 17: MODULE_READY
  progress.advanceTo('MODULE_READY');
  const readyReport = await moduleLoader.readyAll(loadReport.order);
  progress.setRequiredModulesHealthy(readyReport.requiredFailed.length === 0);
  if (readyReport.requiredFailed.length > 0) {
    logger.error('required-modules-ready-failed', {
      modules: readyReport.requiredFailed,
      allReadyFailures: readyReport.failed,
    });
  }

  // Stage 18: STARTUP_COMPLETE
  progress.advanceTo('STARTUP_COMPLETE');
  await eventBus.emit('dumby.system.ready', { degradedModules: loadReport.degraded });

  const inFlightTracker = new InFlightTracker();
  const apiServer = buildApiServer({
    logger,
    progress,
    metrics,
    config,
    adminDeps: {
      dispatcher: new PowerEngineDispatcher(
        { trustedSources: config.get('PEP_TRUSTED_SOURCES') },
        {
          write: async (entry) => {
            await db.knex('audit_logs').insert({
              actorId: entry.actorId,
              source: entry.source,
              reason: entry.reason,
              action: entry.action,
              outcome: entry.outcome,
              rejectionReason: entry.rejectionReason ?? null,
              metadata: JSON.stringify({}),
            });
          },
        },
      ),
      db,
      config,
      auditWriter: {
        write: async (entry) => {
          await db.knex('audit_logs').insert({
            actorId: entry.actorId,
            source: entry.source,
            action: entry.action,
            reason: entry.reason,
            outcome: entry.outcome,
            rejectionReason: entry.rejectionReason ?? null,
            metadata: entry.metadata ?? {},
            createdAt: new Date(entry.at),
          });
        },
      },
    },
  });
  apiServer.addHook('onRequest', async () => inFlightTracker.increment());
  apiServer.addHook('onResponse', async () => inFlightTracker.decrement());
  apiServer.addHook('onError', async () => inFlightTracker.decrement());
  await apiServer.listen({ port: config.get('API_PORT'), host: '0.0.0.0' });

  registerShutdownSignalHandlers({
    logger,
    apiServer,
    healthServer,
    metricsServer,
    moduleLoader,
    moduleOrder: loadReport.order,
    queue,
    redis,
    queueRedis,
    db,
    discordClient,
    drainInFlightCommands: (timeoutMs) => inFlightTracker.waitForDrain(timeoutMs),
  });
  fatalHooks.shutdown = () =>
    gracefulShutdown(
      {
        logger,
        apiServer,
        healthServer,
        metricsServer,
        moduleLoader,
        moduleOrder: loadReport.order,
        queue,
        redis,
        queueRedis,
        db,
        discordClient,
        drainInFlightCommands: (timeoutMs) => inFlightTracker.waitForDrain(timeoutMs),
      },
      'FATAL',
    );

  logger.info('bootstrap-complete', { degradedModules: loadReport.degraded });
}
