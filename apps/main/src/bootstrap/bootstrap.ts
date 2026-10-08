import 'dotenv/config';
import { existsSync } from 'node:fs';
import { Container } from '../di/container.js';
import { CORE_TOKENS } from '../di/tokens.js';
import { parseEnv, pickEnvKeys, ConfigValidationError } from '../config/env.schema.js';
import { ConfigurationError } from '../errors/taxonomy.js';
import { ConfigService } from '../config/config.service.js';
import { HttpCredentialClient } from '../credentials/credential-client.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { I18nManager } from '../i18n/i18n-manager.js';
import { MetricsRegistry } from '../metrics/registry.js';
import { initTracing } from '../tracing/tracing.js';
import { DbClient } from '../db/client.js';
import { ensureMonthlyPartitions, dropExpiredPartitions } from '../db/audit-partition-manager.js';
import { InternalEventBus } from '../events/event-bus.js';
import { EventRouter } from '../events/event-router.js';
import { EventLoopLagMonitor } from '../events/event-loop-lag.js';
import { ShardOwnershipManager, parseShardRange } from '../discord/shard-ownership.js';
import { hostname } from 'node:os';
import { Scheduler } from '../queue/scheduler.js';
import { CacheManager } from '../cache/cache-manager.js';
import { RedisLockStore } from '../cache/redis-lock-store.js';
import { QueueManager } from '../queue/queue-manager.js';
import { ModuleRegistry } from '../module-system/registry.js';
import { loadPolicyLockfile } from '../module-system/policy-lockfile.js';
import { ModuleLoader } from '../module-system/loader.js';
import { defaultEnabledForTier } from '../module-system/tier-rules.js';
import { PermissionResolver } from '../permissions/resolver.js';
import { AdminEvalGate } from '../permissions/admin-eval-gate.js';
import { evaluateRank } from '../permissions/rank.js';
import { PostgresGuildSuspensionStore } from '../governance/guild-suspension.js';
import { createPowerEngineCatalog } from '../http/power-engine-catalog.js';
import { DiscordOAuth2Client } from '../http/oauth/oauth2-client.js';
import { MtpTokenCalculator } from '../analytics/mtp-token-calculator.js';
import { BootstrapProgress } from './stages.js';
import { buildApiServer, buildHealthServer, buildMetricsServer } from '../http/server.js';
import { MdisService } from '../mdis/mdis.service.js';
import { PostgresModuleInstallStore } from '../mdis/mdis.repository.js';
import { OperationalService } from '../operational/operational.service.js';
import { PowerEngineDispatcher } from '../http/power-engine-dispatcher.js';
import { loadModulesFromTierVolumes } from '../module-system/swastik-loader.js';
import { PostgresBuildStore } from '../db/repositories/build.repository.js';
import { PostgresGrantWriter } from '../db/repositories/rbac-grant.repository.js';
import { BuildSignatureVerifier } from '../module-system/build-signing.js';
import { createPublicKey } from 'node:crypto';
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
import { registerCoreFrameHandlers } from '../interactions/core-frame.handlers.js';
import { createPageDataProvider } from '../rendering/page-data.js';
import { registerKnownGuilds } from '../discord/guild-registry.js';
import { createBccmEffectHandlers } from '../commands/bccm-effects.js';
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
  RedisMaintenanceModeState,
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
import { PostgresGuildConfigStore } from '../db/repositories/guild-config.repository.js';
import { Events, REST, type Client } from 'discord.js';
import {
  buildDiscordClient,
  computeIntentsBitfield,
  computePartials,
} from '../discord/client-builder.js';
import { LiveGatewayAdapter } from '../discord/gateway.live-adapter.js';
import { CommandDeployer } from '../commands/command-deployer.js';
import { CoreRenderer } from '../rendering/core-renderer.js';
import { ensureDefaultModuleEmoji } from '../rendering/module-emoji-upload.js';
import {
  InteractionRegistry,
  RedisIdempotencyStore,
} from '../interactions/interaction-registry.js';

/** The resolver's `Rank` is the long form; the RBAC middleware's ladder is the short form. */
const RANK_TO_RBAC: Record<string, 'RESTRICTED' | 'MEMBER' | 'HELPER' | 'MOD' | 'ADMIN' | 'OWNER'> =
  {
    RESTRICTED: 'RESTRICTED',
    MEMBER: 'MEMBER',
    HELPER: 'HELPER',
    MODERATOR: 'MOD',
    ADMINISTRATOR: 'ADMIN',
    OWNER: 'OWNER',
  };

export type RuntimeRole = 'main' | 'worker';

/**
 * §8.4 — the Worker-Only Bootstrap Path. A worker runs the infrastructure stages, then module
 * discovery and job-processor registration, and skips the gateway login, the client-ready stage,
 * and the API/health/metrics servers entirely. A worker never opens a gateway connection and never
 * serves HTTP; the role assertion keeps the two paths from silently converging.
 */
export async function bootstrapWorker(): Promise<void> {
  const progress = new BootstrapProgress();
  progress.advanceTo('PROCESS_SETUP');
  process.title = 'dumby-worker';

  const env = parseEnv(pickEnvKeys(process.env));
  if (env.ROLE !== 'worker') {
    throw new ConfigurationError(`bootstrapWorker() requires ROLE=worker (got "${env.ROLE}")`);
  }
  progress.advanceTo('CONFIG_LOAD');
  const config = new ConfigService(env);
  const container = new Container();
  container.registerValue(CORE_TOKENS.Config, config);

  progress.advanceTo('OBSERVABILITY_INIT');
  const securityHooks: { onTokenLeak?: (d: { where: string }) => void } = {};
  const logger = createLogger(config.get('LOG_LEVEL'), (d) => securityHooks.onTokenLeak?.(d));
  const metrics = new MetricsRegistry();
  container.registerValue(CORE_TOKENS.Logger, logger);
  container.registerValue(CORE_TOKENS.Metrics, metrics);

  progress.advanceTo('DATABASE_CONNECT');
  const db = new DbClient({
    connectionString: config.get('DATABASE_URL'),
    poolMax: config.get('DATABASE_POOL_MAX'),
    statementTimeoutMs: config.get('DATABASE_STATEMENT_TIMEOUT_MS'),
    slowQueryThresholdMs: config.get('SLOW_QUERY_THRESHOLD_MS'),
    criticalQueryThresholdMs: config.get('CRITICAL_QUERY_THRESHOLD_MS'),
    replicaUrls: config.get('DATABASE_REPLICA_URLS'),
    replicaMaxLagMs: config.get('DATABASE_REPLICA_MAX_LAG_MS'),
    migrationsDir: config.get('KNEX_MIGRATIONS_DIR'),
    migrationsExtension: config.get('KNEX_MIGRATIONS_EXT'),
    logger,
  });
  container.registerValue(CORE_TOKENS.Db, db);

  progress.advanceTo('CACHE_CONNECT');
  const redis = new Redis(config.get('REDIS_URL'));
  const lockStore = new RedisLockStore(redis);
  const scheduler = new Scheduler({ logger, lockStore });
  scheduler.register({
    name: 'audit-partition-maintenance',
    cron: '0 3 1 * *',
    execute: async () => {
      await ensureMonthlyPartitions(db.knex);
      await dropExpiredPartitions(db.knex);
    },
  });
  const cache = new CacheManager({
    redis,
    lockStore,
    logger,
    l1MaxEntries: config.get('CACHE_L1_MAX_ENTRIES'),
    l1MaxBytes: config.get('CACHE_L1_MAX_BYTES'),
  });
  container.registerValue(CORE_TOKENS.Cache, cache);
  await cache.startInvalidationSubscription();

  progress.advanceTo('QUEUE_INIT');
  const queueRedis = new Redis(config.get('QUEUE_REDIS_URL'));
  const queue = new QueueManager({
    connection: queueRedis,
    logger,
    defaultConcurrency: config.get('QUEUE_CONCURRENCY_DEFAULT'),
  });
  container.registerValue(CORE_TOKENS.Queue, queue);

  progress.advanceTo('DI_BOOTSTRAP');
  const eventBus = new InternalEventBus({ maxEmitDepth: config.get('EVENT_BUS_MAX_EMIT_DEPTH') });
  const i18n = new I18nManager();
  container.registerValue(CORE_TOKENS.I18n, i18n);
  securityHooks.onTokenLeak = (detail) => {
    logger.fatal('security-token-leak-detected', { ...detail });
    void eventBus.emit('dumby.security.token-leak', detail);
  };
  container.registerValue(CORE_TOKENS.EventBus, eventBus);
  container.freeze();
  const moduleContainer = container.createChild();

  progress.advanceTo('MODULE_DISCOVER');
  const moduleRegistry = new ModuleRegistry();
  const buildStore = new PostgresBuildStore(db.knex);
  const verifier = new BuildSignatureVerifier();
  const buildSigningKeyId = config.get('BUILD_SIGNING_KEY_ID');
  const buildSigningPrivateKey = config.get('BUILD_SIGNING_PRIVATE_KEY');
  let provenanceGuardArmed = buildSigningKeyId !== '' && buildSigningPrivateKey !== '';
  if (provenanceGuardArmed) {
    try {
      verifier.registerKey(buildSigningKeyId, createPublicKey(buildSigningPrivateKey));
    } catch (err) {
      provenanceGuardArmed = false;
      logger.warn('build-signing-key-invalid', { error: String(err) });
    }
  }
  await loadModulesFromTierVolumes({
    modulesDir: config.get('MODULES_DIR'),
    registry: moduleRegistry,
    logger,
    ...(provenanceGuardArmed ? { buildStore, verifier } : {}),
  });

  progress.advanceTo('MODULE_VALIDATE');
  const policyPath = config.get('SECURITY_POLICY_LOCKFILE');
  const securityPolicy = existsSync(policyPath) ? loadPolicyLockfile(policyPath) : undefined;
  const moduleLoader = new ModuleLoader(moduleRegistry, moduleContainer, logger, securityPolicy);
  moduleLoader.validateAll();

  progress.advanceTo('MODULE_LOAD');
  const loadReport = await moduleLoader.loadAll();
  scheduler.start();

  progress.advanceTo('MODULE_READY');
  const readyReport = await moduleLoader.readyAll(loadReport.order);
  progress.setRequiredModulesHealthy(readyReport.requiredFailed.length === 0);

  progress.advanceTo('STARTUP_COMPLETE');
  await eventBus.emit('dumby.system.ready', { role: 'worker' });
  logger.info('worker-bootstrap-complete', { modules: loadReport.order.length });
}

export interface BootstrapOverrides {
  /** Inject a Redis instance (cache/queue/locks/pub-sub) — used by the flow suite. */
  readonly redis?: Redis;
  readonly queueRedis?: Redis;
}

/** The live wiring a booted process exposes, so a flow test can assert and drive shutdown. */
export interface BootstrapHandle {
  readonly container: Container;
  readonly moduleRegistry: ModuleRegistry;
  readonly commandRegistry: CommandRegistry;
  readonly commandRouter: CommandRouter;
  readonly renderer: CoreRenderer;
  readonly eventBus: InternalEventBus;
  readonly interactionRegistry: InteractionRegistry;
  readonly apiServer: ReturnType<typeof buildApiServer>;
  readonly moduleOrder: readonly string[];
  readonly shutdown: (signal?: string) => Promise<void>;
}

export async function bootstrap(overrides: BootstrapOverrides = {}): Promise<BootstrapHandle> {
  const progress = new BootstrapProgress();
  const container = new Container();

  progress.advanceTo('PROCESS_SETUP');
  process.title = 'dumby-headless-backend';
  const fatalHooks: {
    logger: Logger;
    shutdown?: () => Promise<void>;
    notify?: (correlationId: string, error: unknown) => void;
  } = { logger: createLogger('warn') };
  const uninstallFatalHandlers = installFatalHandlers(fatalHooks);
  void uninstallFatalHandlers;

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
  // §8.4 — the full bootstrap refuses to start in the worker role, so the two paths cannot
  // silently converge (a worker must use bootstrapWorker()).
  if (env.ROLE === 'worker') {
    fatalHooks.logger.fatal('bootstrap-refuses-worker-role', {});
    process.exit(1);
  }
  const config = new ConfigService(env);
  container.registerValue(CORE_TOKENS.Config, config);

  progress.advanceTo('HEALTH_SERVER_INIT');
  const healthServer = buildHealthServer(progress);
  await healthServer.listen({
    port: config.get('HEALTH_PORT'),
    host: config.get('HEALTH_BIND_HOST'),
  });

  progress.advanceTo('OBSERVABILITY_INIT');
  const securityHooks: { onTokenLeak?: (d: { where: string }) => void } = {};
  const logger = createLogger(config.get('LOG_LEVEL'), (d) => securityHooks.onTokenLeak?.(d));
  fatalHooks.logger = logger;
  const metrics = new MetricsRegistry();
  container.registerValue(CORE_TOKENS.Logger, logger);
  container.registerValue(CORE_TOKENS.Metrics, metrics);
  // §5.10 — OpenTelemetry tracing. `initTracing` no-ops unless TELEMETRY_ENABLED, so this is
  // inert by default; before this it was never called and the tracing SDK never started.
  initTracing({
    enabled: config.get('TELEMETRY_ENABLED'),
    sampleRate: config.get('TRACE_SAMPLE_RATE'),
    exporterEndpoint: config.get('OTEL_EXPORTER_OTLP_ENDPOINT'),
    serviceName: 'dumby-main',
  });
  const metricsServer = buildMetricsServer(metrics);
  await metricsServer.listen({
    port: config.get('METRICS_PORT'),
    host: config.get('METRICS_BIND_HOST'),
  });

  progress.advanceTo('DATABASE_CONNECT');
  const db = new DbClient({
    connectionString: config.get('DATABASE_URL'),
    poolMax: config.get('DATABASE_POOL_MAX'),
    statementTimeoutMs: config.get('DATABASE_STATEMENT_TIMEOUT_MS'),
    slowQueryThresholdMs: config.get('SLOW_QUERY_THRESHOLD_MS'),
    criticalQueryThresholdMs: config.get('CRITICAL_QUERY_THRESHOLD_MS'),
    // §24 — read-replica routing: reads go to a replica within DATABASE_REPLICA_MAX_LAG_MS, else
    // to the primary. Both keys were previously declared and read by no code.
    replicaUrls: config.get('DATABASE_REPLICA_URLS'),
    replicaMaxLagMs: config.get('DATABASE_REPLICA_MAX_LAG_MS'),
    migrationsDir: config.get('KNEX_MIGRATIONS_DIR'),
    migrationsExtension: config.get('KNEX_MIGRATIONS_EXT'),
    logger,
  });
  container.registerValue(CORE_TOKENS.Db, db);

  progress.advanceTo('MIGRATION_RUN');
  await db.knex.migrate.latest();
  // §24.2.1 — ensure the current and next month's audit partitions exist after migrating.
  await ensureMonthlyPartitions(db.knex);

  progress.advanceTo('CACHE_CONNECT');
  const redis = overrides.redis ?? new Redis(config.get('REDIS_URL'));
  const lockStore = new RedisLockStore(redis);
  // §29.6 — the cron scheduler: module-declared tasks, lock-guarded so one shard runs each tick.
  const scheduler = new Scheduler({ logger, lockStore });
  // §24.2.1 — the monthly audit-partition lifecycle (create next month's, drop expired by drop-only).
  scheduler.register({
    name: 'audit-partition-maintenance',
    cron: '0 3 1 * *',
    execute: async () => {
      await ensureMonthlyPartitions(db.knex);
      await dropExpiredPartitions(db.knex);
    },
  });
  const cache = new CacheManager({
    redis,
    lockStore,
    logger,
    l1MaxEntries: config.get('CACHE_L1_MAX_ENTRIES'),
    l1MaxBytes: config.get('CACHE_L1_MAX_BYTES'),
  });
  container.registerValue(CORE_TOKENS.Cache, cache);
  // §25 — subscribe to the cross-process L1 invalidation broadcast.
  await cache.startInvalidationSubscription();

  progress.advanceTo('QUEUE_INIT');
  const queueRedis = overrides.queueRedis ?? new Redis(config.get('QUEUE_REDIS_URL'));
  const queue = new QueueManager({
    connection: queueRedis,
    logger,
    defaultConcurrency: config.get('QUEUE_CONCURRENCY_DEFAULT'),
  });
  container.registerValue(CORE_TOKENS.Queue, queue);

  progress.advanceTo('DI_BOOTSTRAP');
  const eventBus = new InternalEventBus({ maxEmitDepth: config.get('EVENT_BUS_MAX_EMIT_DEPTH') });
  // §30 — the i18n manager is a core service (guild -> user -> en-US resolution).
  const i18n = new I18nManager();
  container.registerValue(CORE_TOKENS.I18n, i18n);
  // §32.8 — the token-leak owner alert travels the event bus (a fatal log + a security event).
  securityHooks.onTokenLeak = (detail) => {
    logger.fatal('security-token-leak-detected', { ...detail });
    void eventBus.emit('dumby.security.token-leak', detail);
  };
  // §15.1 — the gateway event router: module-declared handlers, dispatched from the client.
  // §16 (UR-C-19) — sample event-loop lag so the router can shed sheddable events under pressure.
  const eventLoopLagMonitor = new EventLoopLagMonitor({
    thresholdMs: config.get('EVENT_LOOP_LAG_SHED_THRESHOLD_MS'),
  });
  eventLoopLagMonitor.start();
  const eventRouter = new EventRouter({ logger, cache, lagMonitor: eventLoopLagMonitor, metrics });
  fatalHooks.notify = (correlationId, error) => {
    try {
      void eventBus.emit('dumby.system.fatal', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
    } catch {}
  };
  const moduleRegistry = new ModuleRegistry();
  const permissionResolver = new PermissionResolver();
  const commandRegistry = new CommandRegistry();
  // §11.5 - the Mode D banner. The asset ships in the image and is served by this app's own API
  // surface, so the URL is built from the deployment's public domain (Railway injects
  // RAILWAY_PUBLIC_DOMAIN). Without a domain - a local run - the banner slot is simply omitted
  // rather than pointed at a URL nothing serves.
  const publicDomain = process.env['RAILWAY_PUBLIC_DOMAIN'];
  const renderer = new CoreRenderer(
    publicDomain !== undefined && publicDomain !== ''
      ? {
          bannerUrl: `https://${publicDomain}/assets/dumby-banner.png`,
          // item 6 - the dashboard carries its own banner; every other module uses the default.
          bannersByModule: { dashboard: `https://${publicDomain}/assets/dashboard-banner.png` },
        }
      : {},
  );
  const interactionRegistry = new InteractionRegistry({
    // Appendix C #19 — shared idempotency, so a double-click is deduped across pods.
    idempotency: new RedisIdempotencyStore(redis),
    // Appendix C #20 — component handlers get a read-only interaction (no Renderer bypass).
    renderer,
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

  const isAdminTierCommand = (name: string) => {
    const def = commandRegistry.get(name);
    return def !== undefined && commandRegistry.getModuleTier(def.moduleId) === 'admin';
  };
  const isCoreTierCommand = (name: string) => {
    const def = commandRegistry.get(name);
    return def !== undefined && commandRegistry.getModuleTier(def.moduleId) === 'core';
  };

  const personaBindingService = new PersonaCommandBindingService(
    new PostgresPersonaIdentityStore(db.knex),
    new PostgresPersonaBindingStore(db.knex),
    logger,
  );

  const guildConfigService = new GuildConfigService(
    new PostgresGuildConfigStore(db.knex),
    cache,
    logger,
  );
  const maintenanceMode = new RedisMaintenanceModeState(redis, logger);
  // Appendix C #19 — the shared maintenance state (no split brain across pods).
  await maintenanceMode.start();

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
        // Finding #3: live sources — the member's permissions from Discord, the requirement from
        // the command's declared Discord permissions.
        getMemberPermissions: async (userId, guildId) => {
          const guild = discordClient?.guilds.cache.get(guildId);
          if (guild === undefined) return [];
          const member = await guild.members.fetch(userId).catch(() => null);
          return member === null ? [] : [...member.permissions.toArray()];
        },
        getRequiredPermissions: (commandName) =>
          commandRegistry.get(commandName)?.permissions?.discord ?? [],
      }),
    )
    .add(
      new RBACMiddleware({
        // Layer 6 (rank function): evaluated from live Discord state, never written.
        getHighestRole: async (userId, guildId) => {
          const guild = discordClient?.guilds.cache.get(guildId);
          if (guild === undefined) return null;
          const isGuildOwner = guild.ownerId === userId;
          const member = isGuildOwner
            ? null
            : await guild.members.fetch(userId).catch(() => null);
          if (member === null && !isGuildOwner) return null;
          const rank = evaluateRank({
            isGuildOwner,
            permissions: member === null ? [] : [...member.permissions.toArray()],
            restricted: false,
          });
          return RANK_TO_RBAC[rank] ?? 'MEMBER';
        },
        getRequiredRole: (commandName) => {
          const rank = commandRegistry.get(commandName)?.permissions?.rbac;
          return rank === undefined ? null : (RANK_TO_RBAC[rank] ?? null);
        },
        isCoreTierCommand,
      }),
    )
    .add(
      new CooldownMiddleware(new InMemoryCooldownStore(), {
        getCooldownMs: (commandName) => commandRegistry.get(commandName)?.cooldownMs ?? 0,
      }),
    )
    .add(
      new DeferMiddleware({
        requiresDefer: (commandName) => commandRegistry.get(commandName)?.requiresDefer ?? false,
        isEphemeral: (commandName) => commandRegistry.get(commandName)?.ephemeral ?? false,
      }),
    )
    .add(new AnalyticsMiddleware(logger));
  const isModuleEnabledInGuild = async (moduleId: string, guildId: string): Promise<boolean> => {
    const tier = moduleRegistry.get(moduleId)?.manifest.tier ?? 'marketplace';
    try {
      const row = await db
        .knex('guild_module_states')
        .where({ guildId, moduleSlug: moduleId })
        .whereNull('deletedAt')
        .first<{ enabled: boolean; state: string }>();

      if (row === undefined) {
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

      return row.enabled === true && row.state === 'active';
    } catch (err) {
      // A Standard-tier module is enabled by default (§13), and the per-guild row is an override.
      // A missing table or a transient read failure must not turn `/hello` into a MODULE_ERROR
      // notice, so fall back to the tier default and record why.
      logger.warn('module-enabled-check-failed', {
        module: moduleId,
        guildId,
        tier,
        error: String(err),
      });
      return defaultEnabledForTier(tier);
    }
  };
  // §22.2 / Table 22-A — one store, shared by the dispatch path (enforcement) and the Power
  // Engine catalog (the control action that writes it).
  const guildSuspensions = new PostgresGuildSuspensionStore(db.knex);
  // §1.7 — page data is gathered at dispatch. Declared before the router so the provider's client
  // getter closes over the client the live branch assigns later.
  let discordClient: Client | undefined;
  const pageDataProvider = createPageDataProvider({
    getClient: () => discordClient,
    moduleRegistry,
    db,
    redis,
    config,
    logger,
  });
  const bccmEffects = createBccmEffectHandlers({ knex: db.knex, registry: commandRegistry, logger });
  const commandRouter = new CommandRouter(commandRegistry, logger, {
    devGuildId: config.get('DEV_GUILD_ID'),
    isModuleEnabledInGuild,
    permissionResolver,
    botOwnerIds: config.get('BOT_OWNER_IDS'),
    middlewarePipeline: commandMiddleware,
    renderer,
    grantStore: new PostgresGrantWriter(db.knex),
    // §22.2 / Table 22-A — the Power Engine `suspendGuild` state the dispatch path must consult.
    guildSuspensions,
    pageDataProvider,
    effectHandlers: bccmEffects,
    resolveCommandOwner: (guildId, moduleSlug) =>
      personaBindingService.resolveCommandOwner(guildId, moduleSlug),
    ...(config.get('PERSONA_ID') !== '' ? { residentPersonaId: config.get('PERSONA_ID') } : {}),
  });
  // §2.4 / §11.3 - the frame's own interactive controls: the D/M/C density control and the
  // navigation dropdown. Registered after the router exists, since each re-enters it.
  registerCoreFrameHandlers({ registry: interactionRegistry, router: commandRouter });
  container.registerValue(CORE_TOKENS.EventBus, eventBus);
  container.registerValue(CORE_TOKENS.EventRouter, eventRouter);
  container.registerValue(CORE_TOKENS.Scheduler, scheduler);
  container.registerValue(CORE_TOKENS.ModuleRegistry, moduleRegistry);
  container.registerValue(CORE_TOKENS.PermissionResolver, permissionResolver);
  // §11 Layer 4 — the framework-provided gate for a deployment's most consequential Admin-tier
  // capability (arbitrary code evaluation being the illustrative worst case). It needs the enable
  // flag *and* a non-production environment; the framework ships the gate, not the capability.
  const adminEvalGate = new AdminEvalGate(
    config.get('CORE_ADMIN_EVAL_ENABLED'),
    config.get('NODE_ENV'),
  );
  container.registerValue(CORE_TOKENS.AdminEvalGate, adminEvalGate);
  const adminEvalGateState = adminEvalGate.check();
  logger.info('admin-eval-gate-state', {
    allowed: adminEvalGateState.allowed,
    reason: adminEvalGateState.reason,
  });
  // §19.7 — the dashboard's Discord OAuth2 client. Both OAUTH_CLIENT_ID and OAUTH_REDIRECT_URI
  // were previously declared and read by no code; the client is inert until they are configured.
  const oauth2Client = new DiscordOAuth2Client({
    config: {
      clientId: config.get('OAUTH_CLIENT_ID'),
      clientSecret: config.get('OAUTH_CLIENT_SECRET'),
      redirectUri: config.get('OAUTH_REDIRECT_URI'),
    },
    logger,
  });
  container.registerValue(CORE_TOKENS.OAuth2, oauth2Client);
  logger.info('oauth2-client-state', { configured: oauth2Client.isConfigured() });
  // §28.5 — the MTP artificial-token cost model. Both MTP_*_TOKEN_THRESHOLD_BYTES keys were
  // previously declared and read by no code; they are the memory/bandwidth charge thresholds.
  const mtpTokens = new MtpTokenCalculator({
    memoryThresholdBytes: config.get('MTP_MEMORY_TOKEN_THRESHOLD_BYTES'),
    bandwidthThresholdBytes: config.get('MTP_BANDWIDTH_TOKEN_THRESHOLD_BYTES'),
  });
  container.registerValue(CORE_TOKENS.MtpTokens, mtpTokens);
  container.registerValue(CORE_TOKENS.CommandRegistry, commandRegistry);
  container.registerValue(CORE_TOKENS.CommandRouter, commandRouter);
  container.registerValue(CORE_TOKENS.Renderer, renderer);
  container.registerValue(CORE_TOKENS.InteractionRegistry, interactionRegistry);
  container.registerValue(CORE_TOKENS.Personas, personaBindingService);
  container.freeze();

  const moduleContainer = container.createChild();

  progress.advanceTo('MODULE_DISCOVER');
  // §15.8/§15.9 (finding #23): arm the loader's load-time provenance guard. It verifies against a
  // signing key, so it is armed exactly when one is configured; without a key the loader keeps its
  // pre-6b behaviour (warn once, import unverified) rather than quarantining every module.
  const buildStore = new PostgresBuildStore(db.knex);
  const verifier = new BuildSignatureVerifier();
  const buildSigningKeyId = config.get('BUILD_SIGNING_KEY_ID');
  const buildSigningPrivateKey = config.get('BUILD_SIGNING_PRIVATE_KEY');
  let provenanceGuardArmed = buildSigningKeyId !== '' && buildSigningPrivateKey !== '';
  if (provenanceGuardArmed) {
    try {
      verifier.registerKey(buildSigningKeyId, createPublicKey(buildSigningPrivateKey));
    } catch (err) {
      provenanceGuardArmed = false;
      logger.warn('build-signing-key-invalid', { error: String(err) });
    }
  }
  const discoveredModules = await loadModulesFromTierVolumes({
    modulesDir: config.get('MODULES_DIR'),
    registry: moduleRegistry,
    logger,
    ...(provenanceGuardArmed ? { buildStore, verifier } : {}),
    // UR-C-07: the operator-configured quarantine directory for a module that fails verification
    // (the loader falls back to `<modulesDir>/quarantine` when it is unset).
    ...(config.get('SWASTIK_QUARANTINE_PATH') !== ''
      ? { quarantineDir: config.get('SWASTIK_QUARANTINE_PATH') }
      : {}),
  });
  logger.info('module-discovery-complete', {
    source: 'tier-volumes',
    modulesDir: config.get('MODULES_DIR'),
    modules: discoveredModules.loaded,
  });

  progress.advanceTo('MODULE_VALIDATE');
  const policyPath = config.get('SECURITY_POLICY_LOCKFILE');
  const securityPolicy = existsSync(policyPath) ? loadPolicyLockfile(policyPath) : undefined;
  const moduleLoader = new ModuleLoader(moduleRegistry, moduleContainer, logger, securityPolicy);
  moduleLoader.validateAll();

  progress.advanceTo('MODULE_LOAD');
  const loadReport = await moduleLoader.loadAll();
  // §29.6 — start the scheduler now the modules have registered their tasks.
  scheduler.start();

  progress.advanceTo('COMMAND_REGISTER');
  logger.info('command-registry-ready', { commandCount: commandRegistry.count() });

  progress.advanceTo('EVENT_REGISTER');

  progress.advanceTo('DISCORD_LOGIN');
  let shardOwnership: ShardOwnershipManager | undefined;
  if (config.get('DISCORD_ADAPTER') === 'live') {
    // §23.2 — claim this pod's shard-ownership locks before the gateway identifies, so a rolling
    // update's handover is safe: Discord invalidates a shard's prior session on a second identify.
    shardOwnership = new ShardOwnershipManager({
      lockStore,
      logger,
      ownerId: `${hostname()}:${process.pid}`,
      heartbeatMs: config.get('SHARD_LOCK_HEARTBEAT_MS'),
      retryMs: config.get('SHARD_LOCK_RETRY_MS'),
    });
    const configuredShards =
      config.get('SHARD_COUNT') > 1 ? parseShardRange(config.get('SHARD_RANGE')) : [0];
    // Bounded claim: ShardOwnershipManager.claim() defaults to Infinity retries, which stalls
    // Stage 15 forever (no crash, no bot online) when a shard lock is held by a stale instance.
    // Bound it so the boot always proceeds to the gateway login.
    logger.info('shard-ownership-claiming', { shards: configuredShards });
    const ownedShards = await shardOwnership.claim(configuredShards, 30);
    shardOwnership.startHeartbeat();
    logger.info('shard-ownership-claimed', { shards: ownedShards, configured: configuredShards });
    const modules = moduleRegistry.all();
    const intents = computeIntentsBitfield(modules.map((m) => m.manifest.intents));
    const partials = computePartials(modules.map((m) => m.manifest.partials));
    discordClient = buildDiscordClient({ intents, partials, logger });
    // §15.1 — subscribe the gateway client to every event a module declared a handler for.
    const subscribedEvents = eventRouter.getRegisteredEvents();
    for (const event of subscribedEvents) {
      discordClient.on(event as never, (...args: unknown[]) => {
        void eventRouter.dispatch(event, ...args);
      });
    }
    logger.info('gateway-events-subscribed', { events: subscribedEvents });

    discordClient.on(Events.InteractionCreate, async (interaction) => {
      if (!isAcceptingGatewayEvents()) return;

      if (interaction.isAutocomplete()) {
        // §2.5 — autocomplete answers within an 800 ms budget; the registry serves the partial or
        // cached set rather than a late or empty answer. Every option space that declares
        // autocomplete (/queue's `command`, /permit's targets) resolves to the same source: the
        // registered command names.
        const focused = interaction.options.getFocused(true);
        const query = String(focused.value).toLowerCase();
        const choices = await interactionRegistry.runAutocomplete(
          async () =>
            commandRegistry
              .all()
              .map((command) => command.data.name)
              .filter((name) => name.toLowerCase().includes(query))
              .slice(0, 25)
              .map((name) => ({ name, value: name })),
          [],
        );
        try {
          await interaction.respond([...choices]);
        } catch (err) {
          logger.warn('autocomplete-respond-failed', { error: String(err) });
        }
        return;
      }

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
        // discord.js defines `channel` and `memberPermissions` as getter-only properties, so the
        // interaction cannot be enriched in place - assigning to `channel` throws
        // "Cannot set property channel of #<BaseInteraction> which has only a getter", which
        // rejects the listener and leaves the interaction unacknowledged ("The application did
        // not respond"). Build a plain adapter carrying the router's CommandInteraction shape
        // instead - the same pattern the component branch below uses.
        const commandInteraction: CommandInteraction = {
          commandName: interaction.commandName,
          user: { id: interaction.user.id },
          guildId: interaction.guildId,
          reply: interaction.reply.bind(interaction) as unknown as CommandInteraction['reply'],
          deferReply: interaction.deferReply.bind(
            interaction,
          ) as unknown as CommandInteraction['deferReply'],
          editReply: interaction.editReply.bind(
            interaction,
          ) as unknown as CommandInteraction['editReply'],
          replied: interaction.replied,
          deferred: interaction.deferred,
          options: interaction.options,
          ...(channel
            ? {
                channel: {
                  id: channel.id,
                  categoryId: channel.parentId ?? null,
                  isNsfw: channel.isNSFW?.() ?? false,
                },
              }
            : {}),
          ...(memberPermissions !== undefined ? { memberPermissions } : {}),
          ...(member?.roles?.cache ? { memberRoles: [...member.roles.cache.keys()] } : {}),
        };
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
          ...(interaction.isStringSelectMenu() ? { values: interaction.values } : {}),
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

  progress.advanceTo('CLIENT_READY');
  if (discordClient) {
    const applicationId = discordClient.application?.id ?? '';
    // item 9 - upload the framework's default white module icon as an application emoji (once).
    // Non-fatal: on failure the unicode fallback applies until the next boot.
    try {
      await ensureDefaultModuleEmoji(discordClient, logger);
    } catch (err) {
      logger.warn('module-emoji-upload-failed', { error: String(err) });
    }
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
    // A failed command-registration must NOT take the bot offline. The client has already
    // logged in (Stage 15) and the gateway connection is independent of command deployment;
    // crashing here would drop a healthy bot every time the Discord REST call hiccups.
    try {
      await commandDeployer.deploy();
    } catch (err) {
      logger.error('command-deploy-failed', {
        error: String(err),
        applicationId,
        devGuildId: config.get('DEV_GUILD_ID'),
      });
    }
    // Twelve tables foreign-key onto `guilds`, so every guild-scoped write needs the guild row to
    // exist first. Register the guilds we are already in before anything touches guild state.
    await registerKnownGuilds(discordClient, db, logger);

    logger.info('discord-client-ready', {
      applicationId,
      guildCount: discordClient.guilds.cache.size,
    });
  }

  progress.advanceTo('MODULE_READY');
  const readyReport = await moduleLoader.readyAll(loadReport.order);
  progress.setRequiredModulesHealthy(readyReport.requiredFailed.length === 0);
  if (readyReport.requiredFailed.length > 0) {
    logger.error('required-modules-ready-failed', {
      modules: readyReport.requiredFailed,
      allReadyFailures: readyReport.failed,
    });
  }

  progress.advanceTo('STARTUP_COMPLETE');
  await eventBus.emit('dumby.system.ready', { degradedModules: loadReport.degraded });

  const inFlightTracker = new InFlightTracker();
  const credentialsClient = new HttpCredentialClient({
    baseUrl: config.get('CREDENTIALS_SERVICE_URL'),
    internalApiKey: config.get('INTERNAL_API_KEY'),
    timeoutMs: config.get('CREDENTIALS_SERVICE_TIMEOUT_MS'),
  });
  // §22.6 — the control plane's audit trail. One writer, carrying the correlation id and the true
  // failure reason (the two rows this used to have silently dropped them).
  const powerEngineAuditWriter = {
    write: async (entry: {
      actorId: string;
      source: string;
      action: string;
      reason: string;
      outcome: 'allowed' | 'rejected' | 'failed';
      rejectionReason?: string;
      failureReason?: string;
      correlationId?: string;
      metadata?: Record<string, string | number | boolean | null>;
      at: number;
    }): Promise<void> => {
      await db.knex('audit_logs').insert({
        actorId: entry.actorId,
        source: entry.source,
        action: entry.action,
        reason: entry.reason,
        outcome: entry.outcome,
        rejectionReason: entry.rejectionReason ?? null,
        metadata: JSON.stringify({
          ...(entry.metadata ?? {}),
          ...(entry.correlationId !== undefined ? { correlationId: entry.correlationId } : {}),
          ...(entry.failureReason !== undefined ? { failureReason: entry.failureReason } : {}),
        }),
        createdAt: new Date(entry.at),
      });
    },
  };
  const powerEngineDispatcher = new PowerEngineDispatcher(
    { trustedSources: config.get('POWER_ENGINE_TRUSTED_SOURCES') },
    powerEngineAuditWriter,
  );
  const powerEngineCatalog = createPowerEngineCatalog({ guildSuspensions, logger });

  const apiServer = buildApiServer({
    logger,
    progress,
    metrics,
    config,
    oauth2Client: oauth2Client.isConfigured() ? oauth2Client : undefined,
    // Appendix C #18 — the MDIS module-delivery and operational-tooling surfaces.
    mdisDeps: { service: new MdisService(moduleRegistry, new PostgresModuleInstallStore(db.knex)) },
    operationalDeps: {
      service: new OperationalService(moduleRegistry, config.get('OPERATIONAL_RUNBOOKS_DIR')),
    },
    adminDeps: {
      dispatcher: powerEngineDispatcher,
      db,
      config,
      auditWriter: powerEngineAuditWriter,
      powerEngineCatalog,
      // §22.5/§15.8: arm the governance surface — the Power Engine operator allow-list (identities that may
      // decide approvals) and the Credentials Service client, used both to verify a presented
      // operator credential and to activate a developer credential on approval (finding #24).
      operatorAllowList: config.get('POWER_ENGINE_OPERATOR_IDS'),
      operatorVerifier: credentialsClient,
      credentialActivator: credentialsClient,
      // Finding #15: arm the power-engine pause/resume routes with the queue manager.
      queueManager: queue,
    },
  });
  apiServer.addHook('onRequest', async () => inFlightTracker.increment());
  apiServer.addHook('onResponse', async () => inFlightTracker.decrement());
  apiServer.addHook('onError', async () => inFlightTracker.decrement());
  await apiServer.listen({ port: config.get('API_PORT'), host: config.get('API_BIND_HOST') });

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
    stopEventLoopMonitor: () => eventLoopLagMonitor.stop(),
    releaseShardLocks: () => shardOwnership?.releaseAll() ?? Promise.resolve(),
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
        stopEventLoopMonitor: () => eventLoopLagMonitor.stop(),
        releaseShardLocks: () => shardOwnership?.releaseAll() ?? Promise.resolve(),
        drainInFlightCommands: (timeoutMs) => inFlightTracker.waitForDrain(timeoutMs),
      },
      'FATAL',
    );

  logger.info('bootstrap-complete', { degradedModules: loadReport.degraded });

  return {
    container,
    moduleRegistry,
    commandRegistry,
    commandRouter,
    renderer,
    eventBus,
    interactionRegistry,
    apiServer,
    moduleOrder: loadReport.order,
    shutdown: (signal = 'SIGTERM') =>
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
          stopEventLoopMonitor: () => eventLoopLagMonitor.stop(),
          releaseShardLocks: () => shardOwnership?.releaseAll() ?? Promise.resolve(),
          drainInFlightCommands: (timeoutMs) => inFlightTracker.waitForDrain(timeoutMs),
        },
        signal,
      ),
  };
}
