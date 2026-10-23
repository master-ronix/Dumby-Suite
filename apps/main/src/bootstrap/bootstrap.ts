import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import { PostgresDeploymentRecordStore } from '../db/repositories/deployment-record.repository.js';
import { buildDeploymentRecord } from '../licensing/deployment-records.js';
import { existsSync } from 'node:fs';
import { Container } from '../di/container.js';
import { CORE_TOKENS } from '../di/tokens.js';
import { parseEnv, pickEnvKeys, ConfigValidationError } from '../config/env.schema.js';
import { ConfigurationError } from '../errors/taxonomy.js';
import { ConfigService } from '../config/config.service.js';
import { HttpCredentialClient } from '../credentials/credential-client.js';
import { resolvePublicDomain } from '../shared/utils/public-domain.js';
import { createLogger, type Logger } from '../logging/logger.js';
import { I18nManager } from '../i18n/i18n-manager.js';
import { MetricsRegistry } from '../metrics/registry.js';
import { initTracing } from '../tracing/tracing.js';
import { DbClient } from '../db/client.js';
import { ensureMonthlyPartitions, dropExpiredPartitions } from '../db/audit-partition-manager.js';
import { InternalEventBus } from '../events/event-bus.js';
import { EventRouter } from '../events/event-router.js';
import { EventLoopLagMonitor } from '../events/event-loop-lag.js';
import {
  claimShardsWithin,
  ShardOwnershipManager,
  parseShardRange,
} from '../discord/shard-ownership.js';
import { hostname } from 'node:os';
import { Scheduler } from '../queue/scheduler.js';
import { CacheManager } from '../cache/cache-manager.js';
import { RedisLockStore } from '../cache/redis-lock-store.js';
import { QueueManager } from '../queue/queue-manager.js';
import { ModuleRegistry } from '../module-system/registry.js';
import { loadPolicyLockfile } from '../module-system/policy-lockfile.js';
import { ModuleLoader } from '../module-system/loader.js';
import { defaultEnabledForTier, resolveModuleEnabled } from '../module-system/tier-rules.js';
import { makeModuleEnablement } from '../module-system/enablement.js';
import {
  createModuleContextStore,
  makeModuleContextResolver,
} from '../module-system/execution-context.js';
import { installModuleContextStore } from '@workspace/swastik';
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
import { PostgresDeveloperRegistry } from '../module-system/developer-registry.js';
import { PostgresBuildStore } from '../db/repositories/build.repository.js';
import { armBuildProvenance, BuildSignatureVerifier } from '../module-system/build-signing.js';
import { rootKeyFromBase64 } from '../crypto/envelope.js';
import { PostgresSealedCredentialStore } from '../db/repositories/sealed-credential.repository.js';
import { SealedCredentialService } from '../credentials/sealed-credential.service.js';
import { PostgresCommandPermissionTokenStore } from '../db/repositories/command-permission-token.repository.js';
import { CommandPermissionTokenService } from '../commands/command-permission-tokens.js';
import { PostgresGrantWriter } from '../db/repositories/rbac-grant.repository.js';
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
import { bccmScopeOf } from '../commands/module-confirmation.js';
import { registerCoreFrameHandlers } from '../interactions/core-frame.handlers.js';
import { createPageDataProvider } from '../rendering/page-data.js';
import { registerKnownGuilds } from '../discord/guild-registry.js';
import { createBccmEffectHandlers } from '../commands/bccm-effects.js';
import { effectiveCommandName, resolveEffectiveCommandNames } from '../commands/command-renames.js';
import { deleteGuildCommands, setGuildCommandPermissions } from '../commands/command-access.js';
import {
  disableConfirmationDescriptor,
  enableConfirmationDescriptor,
  moduleRefusalDescriptor,
} from '../rendering/confirmations.js';
import {
  readDiscoverModalSubmission,
  toCommandInteraction,
  toComponentInteraction,
  type RawInteractionLike,
} from '../interactions/interaction-adapters.js';
import { join } from 'node:path';
import { PersonaOccupiedError } from '../personas/persona.js';
import { PersonaCommandBindingService } from '../personas/persona-command-binding.service.js';
import {
  PersonaRuntime,
  filterRegistryForModules,
  personaRegistryModules,
  deployPersonaCommands,
  splitPersonaPayloads,
} from '../personas/persona-runtime.js';
import { personaPresenceFromClient } from '../personas/persona-presence.js';
import { buildPersonaInteractionHandler } from '../personas/persona-interaction-handler.js';
import { createPersonaOAuthService } from '../personas/persona-oauth.js';
import { openBotTokenOrEmpty, openSealedText } from '../personas/persona-credentials.js';
import { personaSetupCard } from '../rendering/persona-setup.js';
import { personaInviteUrl, publicBaseFrom } from '../personas/persona-invite.js';
import {
  PostgresPersonaBindingStore,
  PostgresPersonaIdentityStore,
} from '../personas/persona.repository.js';
import {
  parseRegistrarSeed,
  PostgresPersonaRegistrarStore,
  seedRegistrarsSafely,
} from '../personas/persona-registrar.repository.js';
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
import { Events, REST, Routes, type Client } from 'discord.js';
import {
  buildDiscordClient,
  computeIntentsBitfield,
  computePartials,
} from '../discord/client-builder.js';
import { LiveGatewayAdapter } from '../discord/gateway.live-adapter.js';
import { CommandDeployer } from '../commands/command-deployer.js';
import { CommandCeilingService } from '../commands/command-ceiling.js';
import { createKnexBccmStore } from '../commands/bccm-batch-push-store.js';
import {
  resolveCommandPayloads,
  runBccmBatchPush,
  type BccmDiscordClient,
} from '../commands/bccm-batch-push.js';
import { CoreRenderer } from '../rendering/core-renderer.js';
import { customEmojiParts, moduleIcon, UNINSTALL_ICON_NAME } from '../rendering/module-icons.js';
import { developerName } from '../rendering/developer-identity.js';
import { ensureDefaultModuleEmoji } from '../rendering/module-emoji-upload.js';
import {
  openEmojiArtworkLedger,
  type EmojiArtworkLedger,
} from '../rendering/emoji-artwork-ledger.js';
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
    connectTimeoutMs: config.get('DATABASE_CONNECT_TIMEOUT_MS'),
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
  // UR-20261012-069 — the worker loads modules too, so its module queues carry the same gate. The
  // registry is built below, hence late-bound.
  let workerQueueGate: ((moduleId: string, guildId: string) => Promise<boolean>) | undefined;
  const queue = new QueueManager({
    connection: queueRedis,
    logger,
    defaultConcurrency: config.get('QUEUE_CONCURRENCY_DEFAULT'),
    isModuleEnabled: (moduleId, guildId) =>
      workerQueueGate ? workerQueueGate(moduleId, guildId) : Promise.resolve(true),
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
  // UR-20261012-069 — arm the worker's module gate now that the registry exists.
  const workerEnablement = makeModuleEnablement({
    knex: db.knex as never,
    moduleRegistry,
    logger,
  });
  workerQueueGate = (moduleId, guildId) =>
    workerEnablement.isModuleEnabledForGuild(guildId, moduleId);
  const buildStore = new PostgresBuildStore(db.knex);
  // §15.8/§15.9 — the hash floor (L1) is ALWAYS enforced against the build row. The signature layer
  // (L2) is OPTIONAL and COORDINATED: armed only when a BUILD_SIGNING_* key is configured, so it adds
  // checking without gating the floor. A bad key degrades to a warning and boot continues.
  const verifier = new BuildSignatureVerifier();
  const provenance = armBuildProvenance(
    verifier,
    config.get('BUILD_SIGNING_KEY_ID'),
    config.get('BUILD_SIGNING_PRIVATE_KEY'),
    config.get('BUILD_SIGNING_PUBLIC_KEY'),
  );
  if (provenance.error !== undefined) {
    logger.warn(
      `build-signing-key-invalid: ${provenance.error} — BUILD_SIGNING_PUBLIC_KEY must be a single-line PEM with escaped newlines`,
      { error: provenance.error },
    );
  }
  // UR-20261019-103 — the signature layer (L2) is MANDATORY: a verifier must be armed or no module can
  // be verified and the bot would serve nothing. Fail the boot loudly instead of loading unverified.
  if (!provenance.armed) {
    throw new Error(
      'BUILD_SIGNING_KEY_ID + BUILD_SIGNING_PUBLIC_KEY (or PRIVATE_KEY) are required — the module build signature is mandatory (UR-20261019-103)',
    );
  }
  await loadModulesFromTierVolumes({
    modulesDir: config.get('MODULES_DIR'),
    registry: moduleRegistry,
    logger,
    buildStore,
    ...(provenance.armed ? { verifier } : {}),
  });

  progress.advanceTo('MODULE_VALIDATE');
  const policyPath = config.get('SECURITY_POLICY_LOCKFILE');
  const securityPolicy = existsSync(policyPath) ? loadPolicyLockfile(policyPath) : undefined;
  const moduleLoader = new ModuleLoader(
    moduleRegistry,
    moduleContainer,
    logger,
    securityPolicy,
    new PostgresDeveloperRegistry(db.knex),
  );
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
    connectTimeoutMs: config.get('DATABASE_CONNECT_TIMEOUT_MS'),
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
  // UR-20261012-069 — a disabled module's cron must not fire. Late-bound, because the enablement read
  // is defined further below.
  let schedulerModuleGate: ((moduleId: string) => Promise<boolean>) | undefined;
  const scheduler = new Scheduler({
    logger,
    lockStore,
    isModuleEnabledAnywhere: (moduleId) =>
      schedulerModuleGate ? schedulerModuleGate(moduleId) : Promise.resolve(true),
  });
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
  // UR-20261012-069 — a disabled module's queued work must not run. Late-bound, like the event gate.
  let queueModuleGate: ((moduleId: string, guildId: string) => Promise<boolean>) | undefined;
  const queue = new QueueManager({
    connection: queueRedis,
    logger,
    defaultConcurrency: config.get('QUEUE_CONCURRENCY_DEFAULT'),
    isModuleEnabled: (moduleId, guildId) =>
      queueModuleGate ? queueModuleGate(moduleId, guildId) : Promise.resolve(true),
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
  // UR-20261011-011 — a disabled module's event handlers must not fire. The gate is late-bound
  // because the enablement check (which reads guild_module_states) is defined further below.
  let moduleEnabledGate: ((moduleId: string, guildId: string) => Promise<boolean>) | undefined;
  const eventRouter = new EventRouter({
    logger,
    cache,
    lagMonitor: eventLoopLagMonitor,
    metrics,
    isModuleEnabled: (moduleId, guildId) =>
      moduleEnabledGate ? moduleEnabledGate(moduleId, guildId) : Promise.resolve(true),
  });
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
  // surface, so the URL is built from the deployment's public domain. Resolved platform-agnostically
  // (PUBLIC_DOMAIN, then Railway's or Render's injected host): reading RAILWAY_PUBLIC_DOMAIN alone
  // meant that on any other host the domain came back empty and EVERY page silently lost its banner.
  // Without a domain - a local run - the banner slot is simply omitted rather than pointed at a URL
  // nothing serves.
  const publicDomain = resolvePublicDomain(process.env, config.get('PUBLIC_DOMAIN'));
  // §1.3 — the zone grammar is enforced inside the renderer; the logger is what makes a relocated
  // block visible, so a module that declares a select among its content blocks is told rather than
  // silently moved.
  const renderer = new CoreRenderer({
    logger,
    ...(publicDomain !== ''
      ? {
          // item 3 — a `?v=` token busts any cached copy: Discord caches media-gallery images and the
          // asset route is served with a long max-age, so a URL that ever resolved differently would
          // otherwise stick. A module page (hello-world) uses the grayscale default below; only the
          // dashboard carries its own banner.
          bannerUrl: `https://${publicDomain}/assets/dumby-banner.png?v=2`,
          bannersByModule: { dashboard: `https://${publicDomain}/assets/dashboard-banner.png?v=2` },
        }
      : {}),
  });
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
        await component.deferReply();
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

  // UR-20261012-030 — the identity store and the envelope root key are both needed by the persona
  // OAuth and Route B paths, so they are bound once here rather than rebuilt per call site.
  const personaIdentities = new PostgresPersonaIdentityStore(db.knex);
  const personaRootKey = rootKeyFromBase64('local', config.get('ENCRYPTION_ROOT_KEY'));
  const personaBindings = new PostgresPersonaBindingStore(db.knex);
  // UR-20261012-037 — the registrar registry, seeded from configuration so a fresh install can
  // register its first persona without a chicken-and-egg.
  const personaRegistrars = new PostgresPersonaRegistrarStore(db.knex);
  await seedRegistrarsSafely(
    personaRegistrars,
    parseRegistrarSeed(config.get('PERSONA_REGISTRAR_AUTHORITIES')),
    (message) => logger.warn(message),
  );
  // UR-20261012-078 — the ownership read needs to know whether a module is ENABLED, and the
  // enablement read is defined further below, so this is late-bound. Until it is armed the answer is
  // `false`, which leaves ownership UNANSWERED rather than guessed — the previous behaviour.
  let moduleEnabledForOwnership:
    ((guildId: string, moduleSlug: string) => Promise<boolean>) | undefined;
  const personaBindingService = new PersonaCommandBindingService(
    personaIdentities,
    personaBindings,
    logger,
    personaRegistrars,
    (guildId, moduleSlug) =>
      moduleEnabledForOwnership === undefined
        ? Promise.resolve(false)
        : moduleEnabledForOwnership(guildId, moduleSlug),
    // UR-20261012-080 — the tier, so a SHARED one is never reported as a profile's.
    (moduleSlug) => moduleRegistry.get(moduleSlug)?.manifest.tier,
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
          const member = isGuildOwner ? null : await guild.members.fetch(userId).catch(() => null);
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
      // UR-20261012-046 — a CORE module is always enabled (§13.2), so the row is never consulted for
      // one. Without this the dispatch path denied `/dashboard` whenever a stale disabled row existed,
      // while the page-data filter said it was enabled: two paths, two answers.
      if (tier === 'core') return true;

      const row = await db
        .knex('guild_module_states')
        .where({ guildId, moduleSlug: moduleId })
        .whereNull('deletedAt')
        .first<{ enabled: boolean; state: string }>();

      if (row === undefined) {
        const enabled = resolveModuleEnabled(tier, undefined);
        if (enabled) {
          await db
            .knex('guild_module_states')
            .insert({ guildId, moduleSlug: moduleId, enabled: true, state: 'active' })
            .onConflict(db.knex.raw('("guildId", "moduleSlug") where "deletedAt" is null'))
            .ignore();
        }
        return enabled;
      }

      return resolveModuleEnabled(tier, row);
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
    // Q1-Q4 — /health reports the PROFILE that ran it: her client, her registry, her start time. The
    // runtime is constructed far below this point, so the read is late-bound; before it exists, the
    // host's own view is the honest answer rather than a guess.
    actingProfile: (applicationId: string) => personaRuntimeRef?.runtimeFor(applicationId),
    // UR-20261012-061 — the ONE ownership read. /persona, /modules, /browse and /dashboard all
    // consult it, so they cannot disagree about which profile holds a module.
    resolveOwner: (guildId, moduleSlug) =>
      personaBindingService.resolveCommandOwner(guildId, moduleSlug),
    getClient: () => discordClient,
    moduleRegistry,
    db,
    redis,
    config,
    logger,
    // UR-20261012-029 — a persona's active state is whether its bot is present in its bound guild.
    isMember: personaPresenceFromClient(
      () => discordClient,
      (message) => logger.warn(message),
    ),
    // UR-20261012-031 — the persona invite URL: the combined install+authorize link when the persona
    // has an OAuth2 secret, else the plain bot install.
    personaInvite: (input) =>
      personaInviteUrl(input, {
        publicBaseUrl: publicBaseFrom(config.get('OAUTH_REDIRECT_URI')),
        permissions: config.get('BOT_INSTALL_PERMISSIONS'),
      }),
  });
  // UR-20261012-030 (Route A) — one OAuth2 client per persona application, built from the client
  // secret the Twill registration sealed. An application without one resolves to undefined, which is
  // exactly when Route B applies.
  const personaOAuth = createPersonaOAuthService({
    identities: personaIdentities,
    openSecret: (sealed) => openSealedText(sealed, personaRootKey),
    redirectUri: config.get('OAUTH_REDIRECT_URI'),
    createClient: (oauthConfig) => new DiscordOAuth2Client({ config: oauthConfig, logger }),
    warn: (message, meta) => logger.warn(message, meta),
  });
  // item 2 — the BCCM effect handlers are built PER IDENTITY (see commandRouterOptions below), so a
  // persona's /queue writes to HER scope and never the main bot's.
  // UR-20261012-049 — ONE description of how a router is configured, so a persona's router is
  // configured exactly as the main bot's is (system-map §11: "the framework running again under a
  // different identity"). `residentPersonaId` is the only thing that varies: the main bot sets it
  // only when the process itself is a persona (`PERSONA_ID`), while a hosted persona always sets its
  // own id so command ownership is enforced for it.
  const commandRouterOptions = (
    residentPersonaId?: string,
    residentBoundGuildId?: string,
    residentProfileName?: string,
    residentAccent?: string,
    // item 2 — the BCCM scope for this identity: '' (the sentinel) for the main bot, the persona's
    // own application id for a persona.
    residentBccmScope?: string,
  ) => ({
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
    effectHandlers: createBccmEffectHandlers({
      knex: db.knex,
      registry: commandRegistry,
      logger,
      applicationId: residentBccmScope ?? '',
    }),
    resolveCommandOwner: (guildId: string, moduleSlug: string) =>
      personaBindingService.resolveCommandOwner(guildId, moduleSlug),
    ...(residentPersonaId !== undefined ? { residentPersonaId } : {}),
    // UR-20261012-057 — the application this router renders for. A persona must reference ITS OWN
    // emoji ids; the main bot uses the default scope.
    // UR-20261012-060 — a persona serves ONE guild; the main bot serves every guild it is installed in.
    ...(residentBoundGuildId !== undefined ? { residentBoundGuildId } : {}),
    // UR-20261012-067 — the acting identity's display name, so a module can present whose page it is.
    ...(residentProfileName !== undefined ? { residentProfileName } : {}),
    // item 1 — the acting profile's accent, so a persona's renders default to HER colour.
    ...(residentAccent !== undefined ? { residentAccent } : {}),
  });
  const commandRouter = new CommandRouter(
    commandRegistry,
    logger,
    commandRouterOptions(config.get('PERSONA_ID') !== '' ? config.get('PERSONA_ID') : undefined),
  );
  // §2.4 / §11.3 - the frame's own interactive controls: the D/M/C density control and the
  // navigation dropdown. Registered after the router exists, since each re-enters it.
  // UR-20261011-009 — whether a module is enabled for a guild (a marketplace module the admin
  // installed, or a standard module they have not disabled). Absent state reads as not-enabled.
  // UR-20261012-069 — the one enablement read, shared with the worker path. It was inline here and
  // duplicated there; a divergence between the two would be a gate that denies what another allows.
  const { isModuleEnabledForGuild, isModuleEnabledAnywhere } = makeModuleEnablement({
    knex: db.knex as never,
    moduleRegistry,
    logger,
  });
  // The event router's gate uses the (moduleId, guildId) order; so does the queue's.
  moduleEnabledGate = (moduleId, guildId) => isModuleEnabledForGuild(guildId, moduleId);
  queueModuleGate = moduleEnabledGate;
  schedulerModuleGate = isModuleEnabledAnywhere;
  // UR-20261012-078 — now that the enablement read exists, arm the ownership read's gate.
  moduleEnabledForOwnership = isModuleEnabledForGuild;

  // UR-20261012-070 — the module execution context, for the entry points that are not a command.
  // The SDK stays environment-neutral, so the CARRIER is installed here: AsyncLocalStorage, the same
  // mechanism the framework's own event bus uses. `identity()` is late-bound and async because the
  // application id comes from the Discord client (not ready at Stage 12) and a persona's bound guild
  // is a database read.
  installModuleContextStore(createModuleContextStore());
  const processIdentity = async (): Promise<{
    profileId: string;
    kind: 'main' | 'persona';
    applicationId: string;
    profileName: string;
    boundGuildId?: string;
  }> => {
    const personaId = config.get('PERSONA_ID');
    const isPersona = personaId !== '';
    let boundGuildId: string | undefined;
    if (isPersona) {
      try {
        boundGuildId = (await personaIdentities.findById(personaId))?.boundGuildId;
      } catch (err) {
        logger.warn(`module-context-persona-lookup-failed id=${personaId} reason=${String(err)}`);
      }
    }
    return {
      profileId: isPersona ? personaId : 'main',
      kind: isPersona ? 'persona' : 'main',
      applicationId: discordClient?.application?.id ?? '',
      profileName: discordClient?.user?.username ?? 'Dumby',
      ...(boundGuildId !== undefined && boundGuildId !== '' ? { boundGuildId } : {}),
    };
  };
  const moduleContextResolver = makeModuleContextResolver({
    identity: processIdentity,
    registry: moduleRegistry,
    isModuleEnabledForGuild,
    resolveOwner: (guildId, moduleSlug) =>
      personaBindingService.resolveCommandOwner(guildId, moduleSlug),
    logger,
  });

  const TIER_LABEL: Readonly<Record<string, string>> = {
    admin: 'Admin',
    core: 'Core',
    standard: 'Standard',
    marketplace: 'Marketplace',
  };
  // UR-20261011-011 — the instant command-access gate (Discord's per-guild command permissions),
  // late-bound because it needs the REST client, which is built after login. On a module disable the
  // framework writes a DENY override for `@everyone` so the command disappears from members'
  // effective access instantly, while the deregistration is batched on the change queue (§17.6/§17.7).
  let setModuleCommandAccess:
    ((moduleId: string, guildId: string, allowed: boolean) => Promise<void>) | undefined;
  // UR-20261011-010 — the module detail card (item 8): a formal, meaningful, banner-less card.
  // It renders at MEDIUM density (no banner, no per-field dividers) as a single content block, and
  // attributes the developer by NAME (not the raw `devId`). A CORE module carries NO uninstall
  // control at all — it can never be uninstalled (§13.2).
  const moduleInfoPayload = async (
    applicationId: string,
    moduleId: string,
    guildId: string | null,
    invokerId: string,
    surface?: string,
  ): Promise<unknown> => {
    const entry = moduleRegistry.get(moduleId);
    if (entry === undefined) {
      return renderer.render({ surface: 'Module', sections: [`No module named ${moduleId}.`] });
    }
    const m = entry.manifest;
    const isCore = m.tier === 'core';
    const isMarketplace = m.tier === 'marketplace';
    const enabledForGuild = await isModuleEnabledForGuild(guildId, moduleId);
    const uninstallable = !isCore && (!isMarketplace || enabledForGuild);
    const displayName = m.ui?.displayName ?? m.name;
    const status = isCore
      ? 'Core — always enabled'
      : enabledForGuild
        ? 'Enabled'
        : 'Disabled — re-enable from /browse';
    const commands =
      m.commands.length === 0
        ? 'none'
        : m.commands.map((command) => `\`/${command.name}\``).join(', ');
    const block = [
      `${moduleIcon(m.ui?.icon, applicationId)} **${displayName}** · ${TIER_LABEL[m.tier] ?? m.tier}`,
      `-# ${m.description}`,
      '',
      `**Developer**  ${developerName(m.devId)}`,
      `**Version**  ${m.version}`,
      `**Status**  ${status}`,
      `**Commands**  ${m.commands.length} — ${commands}`,
    ].join('\n');
    // UR-20261011-018 — the uninstall/disable control belongs to the /modules detail card ONLY.
    // The /browse Info view is informational (no disable control there).
    const showControl = !isCore && surface !== 'browse';
    return renderer.render({
      surface: displayName,
      mode: 'M',
      // The detail card is a PRIVATE reply, so it follows the ephemeral grammar: one container, no
      // accent, no footer. It was rendered as a page, which is why a persona's Info card came back
      // amber — the colour of a profile the card does not belong to.
      ephemeral: true,
      sections: [block],
      ...(showControl
        ? {
            actions: [
              [
                {
                  customId: `dumby:act:${invokerId}:uninstall:${m.name}`,
                  label: '',
                  emoji: customEmojiParts(UNINSTALL_ICON_NAME, applicationId) ?? { name: '🗑️' },
                  style: 4,
                  disabled: !uninstallable,
                },
              ],
            ],
          }
        : {}),
    });
  };
  // UR-20261011-018 — the formal Compact (Mode C) confirmation shown after a module is disabled:
  // a single identity line plus the outcome, per the operator's request for a professional result
  // at Compact density.
  // Both confirmations are PRIVATE, so both DECLARE it. `ephemeral` is not cosmetic: it is what makes
  // the renderer apply the ephemeral grammar — one container, no accent, no footer. Omitting it while
  // SENDING privately is exactly how a hidden card came to carry a public page's accent.
  const moduleDisableConfirmation = async (moduleId: string): Promise<unknown> => {
    return renderer.render({
      ...disableConfirmationDescriptor(moduleId, moduleRegistry.get(moduleId)),
      mode: 'C',
      ephemeral: true,
    });
  };
  /**
   * The notice a REFUSED module change gets.
   *
   * A module another profile holds is offered in /browse so the operator is told rather than shown a
   * control that vanishes — and selecting it is refused by the install path. That refusal must be
   * ANSWERED. It used to propagate out of the frame handler, leaving the interaction unanswered, so
   * selecting an occupied module did nothing at all. A refusal is for the member who tried, so this is
   * ephemeral, and it is a formal notice rather than a sentence.
   */
  const moduleRefusalNotice = async (moduleId: string, error: unknown): Promise<unknown> => {
    // Resolve the holder's NAME first: the descriptor is pure and takes a synchronous resolver, and
    // the name comes from the Twill registration (`persona_identities.name`).
    const ownerId =
      typeof error === 'object' && error !== null && 'personaId' in error
        ? (error as { personaId?: unknown }).personaId
        : undefined;
    let ownerName: string | undefined;
    if (typeof ownerId === 'string' && ownerId !== 'main') {
      try {
        ownerName = (await personaIdentities.findById(ownerId))?.name;
      } catch (err) {
        logger.warn('module-refusal-owner-name-unavailable', { ownerId, reason: String(err) });
      }
    }
    // The renderer ALREADY set `IS_COMPONENTS_V2 | EPHEMERAL` on this message. Do not overwrite
    // `flags`: setting EPHEMERAL alone (64) drops the Components-v2 bit (32768) and Discord rejects
    // the payload outright — which is why selecting an occupied module appeared to do nothing at all,
    // even after the refusal was being answered.
    return renderer.renderNotice({
      ...moduleRefusalDescriptor(moduleId, moduleRegistry.get(moduleId), error, () => ownerName),
      reason: 'FORBIDDEN',
      traceId: renderer.createTraceId(),
      ephemeral: true,
    });
  };

  const moduleEnableConfirmation = async (moduleId: string): Promise<unknown> => {
    return renderer.render({
      ...enableConfirmationDescriptor(moduleId, moduleRegistry.get(moduleId)),
      mode: 'C',
      ephemeral: true,
    });
  };
  // UR-20261011-010 — a module's commands are enqueued on the guild command change queue (BCCM,
  // §6.4/§17.7) so their Discord deregistration / re-registration is batched, while the state write
  // makes them non-dispatchable immediately through the router's guild enablement gate (§13.7).
  const enqueueModuleCommandChanges = async (
    moduleId: string,
    guildId: string,
    userId: string,
    action: 'disable' | 'enable',
    /**
     * The BCCM scope of the identity that made the change: '' for the main bot, the persona's own
     * application id for a persona. The column DEFAULTS to '' (the main bot), so omitting it queued
     * every persona's change into the MAIN bot's queue — where the persona's own push, which is scoped
     * to her application, would never see it, and her command was never deregistered.
     */
    applicationId: string,
  ): Promise<void> => {
    const entry = moduleRegistry.get(moduleId);
    if (entry === undefined || entry.manifest.commands.length === 0) return;
    await db.knex('guild_command_queue').insert(
      entry.manifest.commands.map((command) => ({
        guildId,
        commandKey: command.name,
        applicationId,
        payload: { action, submittedBy: userId },
        status: 'pending',
      })),
    );
    logger.info('bccm-module-command-change-queued', {
      moduleId,
      guildId,
      action,
      count: entry.manifest.commands.length,
    });
  };
  // item 9 — the install/enable action enables the module for the guild (guild_module_states) and
  // queues its commands' re-registration (BCCM).
  /**
   * UR-20261012-066 — the module logos, collected from the registry.
   *
   * Each module declares its own emoji name (`ui.icon`) and its own image (`ui.iconAsset`, relative to
   * the module's root). The core resolves the pair; it holds no copy of either. A module that declares
   * no asset — or whose root the loader did not record — is skipped, and the framework fallback icon
   * applies, which is ADR-012's "absent a declaration, the default applies".
   */
  const collectModuleIcons = (): readonly { name: string; path: string }[] => {
    const icons: { name: string; path: string }[] = [];
    for (const entry of moduleRegistry.all()) {
      const name = entry.manifest.ui?.icon;
      const asset = entry.manifest.ui?.iconAsset;
      const root = entry.root;
      if (name === undefined || asset === undefined || root === undefined) continue;
      icons.push({ name, path: join(root, asset) });
    }
    return icons;
  };

  /**
   * Run the BCCM batch push NOW for one identity.
   *
   * This is the designed mechanism for a module change: the state write and the queue entry are the
   * record, and the push reconciles Discord's registered set with it — applying the `disable`/`enable`
   * that was queued. It replaces a full bulk re-registration, which was a THIRD path: neither the
   * instant Integrations override nor the batched BCCM, and one that raced both.
   */
  let pushBccmNow: ((applicationId: string) => Promise<void>) | undefined;

  const runBccmForModuleChange = async (applicationId: string, reason: string): Promise<void> => {
    if (pushBccmNow === undefined) {
      logger.warn('bccm-push-unavailable', { reason });
      return;
    }
    try {
      await pushBccmNow(applicationId);
      logger.info('bccm-push-on-demand', { reason });
    } catch (err) {
      logger.error('bccm-push-on-demand-failed', { reason, error: String(err) });
    }
  };

  const installModule = async (
    moduleId: string,
    guildId: string | null,
    userId: string,
    applicationId?: string,
  ): Promise<void> => {
    if (guildId === null || moduleRegistry.get(moduleId) === undefined) return;

    // UR-20261012-061 — OWNERSHIP. A standard/marketplace module belongs to ONE profile in a guild,
    // whoever claimed it first. Installing it from the other profile is refused, not silently allowed.
    const owner = await personaBindingService.resolveCommandOwner(guildId, moduleId);
    const acting =
      applicationId === undefined
        ? undefined
        : await personaIdentities.findByApplicationId(applicationId);
    // UR-20261012-078 — the actor is 'main' when no application identified it (the main bot's own
    // install), matching the ownership read's answer for an enabled-but-unbound module.
    if (owner !== undefined && (acting?.id ?? 'main') !== owner) {
      logger.warn(
        `marketplace-module-occupied module=${moduleId} guild=${guildId} owner=${owner} actor=${acting?.id ?? 'main'}`,
      );
      // UR-20261012-077 — name the actor. This is the refusal logged as occupied by "another persona", which read as if the persona had been refused her own module.
      throw new PersonaOccupiedError(guildId, moduleId, owner, acting?.id ?? 'main');
    }
    // A PERSONA installing an unclaimed module CLAIMS it: the first profile to install owns it.
    if (owner === undefined && acting !== undefined) {
      await personaBindingService.bindModuleToPersona({
        guildId,
        moduleSlug: moduleId,
        personaId: acting.id,
      });
      logger.info(
        `marketplace-module-claimed module=${moduleId} guild=${guildId} persona=${acting.id}`,
      );
    }

    await db
      .knex('guild_module_states')
      .insert({ guildId, moduleSlug: moduleId, enabled: true, state: 'active' })
      .onConflict(db.knex.raw('("guildId", "moduleSlug") where "deletedAt" is null'))
      .merge({ enabled: true, state: 'active', updatedAt: db.knex.fn.now() });
    await setModuleCommandAccess?.(moduleId, guildId, true);
    await enqueueModuleCommandChanges(moduleId, guildId, userId, 'enable', bccmScopeOf(acting));
    // REGISTER it, don't just enable it. Enabling wrote the database and queued a rename push, but
    // nothing told Discord: registration happened only at boot — and that deploy is fire-and-forget,
    // on a host that hibernates — or when a guild joined. A module installed from /browse therefore
    // had no command until some later boot, which reads as a command registry that does not work.
    // `deployForGuild` re-registers this guild's whole scoped set, which is exactly what has to agree
    // with the module list. A failure is logged, never fatal: the module IS installed either way.
    await runBccmForModuleChange(bccmScopeOf(acting), `install:${moduleId}`);
    logger.info('marketplace-module-installed', { moduleId, guildId, userId });
  };
  // UR-20261011-010 — the detail card's uninstall/disable control disables the module for the guild
  // (state write), queues its commands' deregistration (BCCM), and relists it in /browse. A CORE
  // module is never uninstallable (§13.2), so it is refused here as well as in the card.
  const uninstallModule = async (
    moduleId: string,
    guildId: string | null,
    userId: string,
    applicationId?: string,
  ): Promise<void> => {
    const entry = moduleRegistry.get(moduleId);
    if (guildId === null || entry === undefined || entry.manifest.tier === 'core') return;
    // The ACTING identity, for the same reason the install resolves it: the BCCM queue and the
    // command-permission override are both per-application, and this path was not told which one.
    const acting =
      applicationId === undefined
        ? undefined
        : await personaIdentities.findByApplicationId(applicationId);
    await db
      .knex('guild_module_states')
      .insert({ guildId, moduleSlug: moduleId, enabled: false, state: 'disabled' })
      .onConflict(db.knex.raw('("guildId", "moduleSlug") where "deletedAt" is null'))
      .merge({ enabled: false, state: 'disabled', updatedAt: db.knex.fn.now() });
    await setModuleCommandAccess?.(moduleId, guildId, false);
    await enqueueModuleCommandChanges(moduleId, guildId, userId, 'disable', bccmScopeOf(acting));
    // …and DEREGISTER it, for the same reason: a disabled module whose command stays registered is a
    // command the member can see and that the bot then refuses.
    await runBccmForModuleChange(bccmScopeOf(acting), `uninstall:${moduleId}`);
    logger.info('module-uninstalled', { moduleId, guildId, userId });
  };

  // Each application has its own router, and the component registry is shared — so a control pressed
  // on a persona's page must be re-dispatched through HER router, not the main bot's. The main bot's
  // is the fallback; a hosted persona registers hers when her runtime starts.
  const personaRouters = new Map<string, CommandRouter>();
  registerCoreFrameHandlers({
    routerFor: (applicationId: string) => personaRouters.get(applicationId),
    /**
     * The private confirmation for a module change. EPHEMERAL (flags 64) on purpose: a member who
     * installs or disables a module gets told so, and the channel does not.
     */
    moduleRefusal: (moduleId: string, error: unknown) => moduleRefusalNotice(moduleId, error),
    moduleConfirmation: (moduleId: string, action: 'installed' | 'disabled') =>
      action === 'installed'
        ? moduleEnableConfirmation(moduleId)
        : moduleDisableConfirmation(moduleId),
    registry: interactionRegistry,
    router: commandRouter,
    moduleInfo: (moduleId, guildId, invokerId, surface, applicationId) =>
      moduleInfoPayload(applicationId ?? '', moduleId, guildId, invokerId, surface),
    installModule,
    uninstallModule,
    disableConfirmation: moduleDisableConfirmation,
    // UR-20261012-029 / UR-20261012-054 — the private persona Info card: the OAuth redirect callback
    // guide and nothing else. The install guide and the invite link were rejected — Discord publishes
    // no API for an application's redirect list, so a link offered here could not be verified.
    personaSetup: async (applicationId) => {
      const persona = await personaIdentities.findByApplicationId(applicationId);
      return personaSetupCard({
        callbackUrl: config.get('OAUTH_REDIRECT_URI'),
        ...(persona === undefined ? {} : { personaName: persona.name }),
      });
    },
  });
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
  // UR-20261011-020 — the per-guild command-permission token store. Values are sealed at rest with
  // the same envelope root key the credentials service uses, so a database dump never yields a
  // usable token. The service is inert until the dashboard's Authorize flow stores one, and the
  // command-permissions write falls back to the static env token when it holds nothing.
  const commandPermissionTokens = new CommandPermissionTokenService({
    store: new PostgresCommandPermissionTokenStore(db.knex),
    sealer: new SealedCredentialService(
      new PostgresSealedCredentialStore(db.knex),
      rootKeyFromBase64('local', config.get('ENCRYPTION_ROOT_KEY')),
    ),
    refresher: oauth2Client,
    logger,
  });
  scheduler.register({
    name: 'command-permission-token-refresh',
    cron: '0 */6 * * *',
    execute: async () => {
      const result = await commandPermissionTokens.refreshDue();
      logger.info('command-permission-token-refresh-complete', result);
    },
  });
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
  // §15.8/§15.9 — the hash floor (L1) is ALWAYS enforced; the signature layer (L2) is OPTIONAL and
  // COORDINATED: armed only when a BUILD_SIGNING_* key is configured.
  const buildStore = new PostgresBuildStore(db.knex);
  const verifier = new BuildSignatureVerifier();
  const provenance = armBuildProvenance(
    verifier,
    config.get('BUILD_SIGNING_KEY_ID'),
    config.get('BUILD_SIGNING_PRIVATE_KEY'),
    config.get('BUILD_SIGNING_PUBLIC_KEY'),
  );
  if (provenance.error !== undefined) {
    logger.warn(
      `build-signing-key-invalid: ${provenance.error} — BUILD_SIGNING_PUBLIC_KEY must be a single-line PEM with escaped newlines`,
      { error: provenance.error },
    );
  }
  // UR-20261019-103 — the signature layer (L2) is MANDATORY: a verifier must be armed or no module can
  // be verified and the bot would serve nothing. Fail the boot loudly instead of loading unverified.
  if (!provenance.armed) {
    throw new Error(
      'BUILD_SIGNING_KEY_ID + BUILD_SIGNING_PUBLIC_KEY (or PRIVATE_KEY) are required — the module build signature is mandatory (UR-20261019-103)',
    );
  }
  const discoveredModules = await loadModulesFromTierVolumes({
    modulesDir: config.get('MODULES_DIR'),
    registry: moduleRegistry,
    logger,
    buildStore,
    ...(provenance.armed ? { verifier } : {}),
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
  const moduleLoader = new ModuleLoader(
    moduleRegistry,
    moduleContainer,
    logger,
    securityPolicy,
    new PostgresDeveloperRegistry(db.knex),
  );
  moduleLoader.setModuleContextResolver(moduleContextResolver);
  // UR-20261012-072 — the config service is built before the loader, so the notifier is attached
  // here. A per-guild module config write now reaches the module's `onConfigChange` (§11.7).
  guildConfigService.setModuleConfigChangeNotifier((moduleSlug, guildId, config) => {
    void moduleLoader.notifyConfigChange(moduleSlug, guildId, config);
  });
  moduleLoader.validateAll();

  progress.advanceTo('MODULE_LOAD');
  const loadReport = await moduleLoader.loadAll();
  // §17.7/§17.8 — the BCCM batch push. Registered before the scheduler starts; the Discord
  // client is resolved lazily because the REST client is only built after login.
  let bccmDiscordClient: BccmDiscordClient | undefined;
  const commandCeiling = new CommandCeilingService({
    getCurrentCommandCount: async (guildId) => {
      const rows = await db
        .knex('guild_module_states')
        .where({ guildId, enabled: true, state: 'active' })
        .whereNull('deletedAt')
        .select<{ moduleSlug: string }[]>('moduleSlug');
      return rows.reduce(
        (sum, row) => sum + (moduleRegistry.get(row.moduleSlug)?.manifest.commands.length ?? 0),
        0,
      );
    },
    getPendingAdditions: async (guildId) => {
      const rows = await db
        .knex('guild_command_queue')
        .where({ guildId, status: 'pending' })
        .whereNull('deletedAt')
        .whereRaw("payload->>'action' in ('rename', 'alias', 'enable', 'reset')")
        .count<{ count: string }[]>('* as count');
      return Number(rows[0]?.count ?? 0);
    },
    getPendingRemovals: async (guildId) => {
      const rows = await db
        .knex('guild_command_queue')
        .where({ guildId, status: 'pending' })
        .whereNull('deletedAt')
        .whereRaw("payload->>'action' = 'disable'")
        .count<{ count: string }[]>('* as count');
      return Number(rows[0]?.count ?? 0);
    },
  });
  const bccmStore = createKnexBccmStore(db.knex);
  scheduler.register({
    name: 'bccm-batch-push',
    cron: '0 */12 * * *',
    execute: async () => {
      if (bccmDiscordClient === undefined) {
        logger.warn('bccm-batch-push-skip', { reason: 'discord client not ready' });
        return;
      }
      await runBccmBatchPush({
        store: bccmStore,
        logger,
        ceiling: commandCeiling,
        discord: bccmDiscordClient,
        dryRun: config.get('BCCM_BATCH_PUSH_DRY_RUN'),
        // item 2 — the main bot's own scope ('' sentinel), so pre-migration rows stay visible.
        applicationId: commandRegistry.profile.applicationId,
      });
    },
  });

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
    // Bounded AND deadlined. The attempt cap alone is not enough: it too requires Redis to answer, so
    // an unreachable lock store stalls the boot before the port is ever bound. See claimShardsWithin.
    const ownedShards = await claimShardsWithin(shardOwnership, configuredShards, logger);
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
        const choices = await interactionRegistry.runAutocomplete(async () => {
          // §2.5 / BCCM — a command's suggestion shows its CURRENT name (the applied rename when
          // one exists), while the submitted value stays the registered command key.
          const effective = await resolveEffectiveCommandNames(
            db.knex,
            interaction.guildId,
            // item 2 — BCCM is profile-scoped: the main bot's scope is '' (the sentinel).
            commandRegistry.profile.applicationId,
          );
          return commandRegistry
            .all()
            .map((command) => {
              const key = command.data.name;
              return { name: effectiveCommandName(effective, key), value: key };
            })
            .filter((choice) => choice.name.toLowerCase().includes(query))
            .slice(0, 25);
        }, []);
        try {
          await interaction.respond([...choices]);
        } catch (err) {
          logger.warn('autocomplete-respond-failed', { error: String(err) });
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        // UR-20261012-043 (A2.1) — the adapter is built by the shared, tested module. discord.js
        // defines `channel` and `memberPermissions` as getter-only, so the interaction cannot be
        // enriched in place; the adapter carries the router's CommandInteraction shape instead.
        const commandInteraction = toCommandInteraction(
          interaction as unknown as RawInteractionLike,
        );
        void commandRouter.dispatch(commandInteraction).catch(async (err) => {
          logger.error('interaction-dispatch-failed', {
            command: interaction.commandName,
            error: String(err),
          });
        });
        return;
      }

      if (interaction.isModalSubmit()) {
        // item 5b — the Discover modal: re-render the /browse page with the submitted search query.
        const modal = interaction as unknown as RawInteractionLike & {
          update(options: unknown): Promise<unknown>;
        };
        const submission = readDiscoverModalSubmission(modal, interaction.user.id);
        if (submission !== undefined) {
          try {
            const payload = await commandRouter.buildBrowseRender(
              interaction.user.id,
              interaction.guildId,
              submission.query,
            );
            await modal.update(payload);
          } catch (err) {
            logger.warn('discover-modal-submit-failed', { error: String(err) });
          }
        }
        return;
      }

      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        const componentInteraction = toComponentInteraction(
          interaction as unknown as RawInteractionLike,
        );
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
  // UR-20261012-082 — late-bound: the persona runtime is created inside a nested block, while the
  // Twill surface is built later in this same function. The presence hook needs to reach the RUNNING
  // runtime, so it is held here at function scope and assigned when the runtime is constructed.
  let personaRuntimeRef: PersonaRuntime | undefined;

  // §11.5 / UR-20261012-057 — ONE artwork ledger for the whole boot, shared by the main bot and every
  // persona. The recorded map is keyed by application, so both reconcile against the same evidence:
  // an emoji whose asset changed is replaced rather than reused under its old artwork. Opened lazily
  // and once — a boot that uploads nothing pays nothing.
  let emojiLedgerPromise: Promise<EmojiArtworkLedger> | undefined;
  const emojiLedger = (): Promise<EmojiArtworkLedger> =>
    (emojiLedgerPromise ??= openEmojiArtworkLedger(db.knex));

  if (discordClient) {
    const applicationId = discordClient.application?.id ?? '';
    // item 9 - upload the framework's default white module icon as an application emoji (once).
    // Non-fatal: on failure the unicode fallback applies until the next boot.
    //
    // UR-20261012-062 — the MAIN BOT registers under its OWN application id, exactly as a persona does.
    //
    // UR-060 made the render look an emoji up by the application Discord states on the interaction —
    // for the main bot, its real application id. This upload still used the DEFAULT scope (the empty
    // string), so registration and lookup used different keys and the main bot missed EVERY icon while
    // a persona (which passes its own id on both sides) resolved all of them. The render is right; the
    // registration had to be brought into line with it.
    try {
      await ensureDefaultModuleEmoji(
        discordClient,
        logger,
        applicationId,
        collectModuleIcons(),
        await emojiLedger(),
      );
    } catch (err) {
      logger.warn('module-emoji-upload-failed', { error: String(err) });
    }
    // UR-20261012-028 — adopt any command-permission token rows written before the store was keyed
    // by application, now that the running application's id is known. Non-fatal by design.
    await commandPermissionTokens.adoptLegacy(applicationId);

    // UR-20261012-038 — host every active persona's gateway, so a Twill-registered persona is
    // actually ONLINE in its bound guild rather than only listed. Off by default: each persona costs
    // one gateway connection, which is an operator decision.
    if (config.get('PERSONA_RUNTIME_ENABLED')) {
      // §13 — core is shared by every profile, so a persona always carries the core commands. Only
      // standard/marketplace is claimable, and only by the profile that claimed it.
      const coreModuleSlugs = moduleRegistry
        .all()
        .filter((m) => m.manifest.tier === 'core')
        .map((m) => m.manifest.name);
      const personaRuntime = new PersonaRuntime({
        listPersonas: () => personaIdentities.list(),
        openBotToken: (sealed) => openSealedText(sealed, personaRootKey),
        modulesBoundTo: async (personaId) =>
          (await personaBindings.listForPersona(personaId)).map((binding) => binding.moduleSlug),
        // UR-20261012-054 — the FULL registry, not a filtered one.
        //
        // A persona registers the SAME command set as the main bot. What it may ANSWER is decided by
        // ownership, in the router (`assertPersonaOwnsCommand`), not by what it registers: registering
        // only the bound modules meant a persona with nothing bound registered NOTHING, so its commands
        // never existed and stale ones were never cleared. The guild binding is the restriction.
        // UR-20261012-050 — the persona's registry carries the CORE commands plus the modules it holds.
        //
        // Core is shared by every profile (§13), so it is always present; a standard/marketplace module
        // appears only for the profile that claimed it. Filtering to the BINDINGS ALONE was the other
        // failure: a persona with nothing bound registered NOTHING — not even `/dashboard` — which is
        // what UR-20261012-054 was written about when it chose the full registry instead.
        //
        // UR-20261012-054's "the full registry" is superseded here. A persona that registers a command
        // it will then refuse shows a member a control that cannot work, and the dashboard already
        // omits those modules — so registered and answerable now agree, which neither extreme achieved.
        buildRegistry: (moduleSlugs, profile) =>
          filterRegistryForModules(
            commandRegistry,
            new Set(personaRegistryModules(coreModuleSlugs, moduleSlugs)),
            profile,
          ),
        // The gateway intents/partials are computed for the main client in an earlier scope, so they
        // are derived again here from the same source of truth: the module manifests.
        createClient: () => {
          const hosted = moduleRegistry.all();
          const client = buildDiscordClient({
            intents: computeIntentsBitfield(hosted.map((m) => m.manifest.intents)),
            partials: computePartials(hosted.map((m) => m.manifest.partials)),
            logger,
          });
          // UR-20261012-081 — the presence port. Applied after login (see persona-runtime), because
          // `client.user` does not exist until the gateway is ready. Activity type 4 is CUSTOM, which
          // is the "status quote" — it renders beside the bot's name rather than as a playing/watching
          // line.
          return Object.assign(client, {
            setPresence: (presence: { status: string; note?: string }) => {
              // UR-20261012-086 — never a silent no-op. `client.user` exists only once the gateway is
              // ready; the optional chain this replaces would have swallowed that, leaving the caller
              // to log a confident "applied" for a presence that never went anywhere.
              const user = client.user;
              if (user === null || user === undefined) {
                logger.warn(
                  'persona-presence-no-user — the client is not ready; the presence was NOT applied',
                );
                return;
              }
              user.setPresence({
                status: presence.status as never,
                // UR-20261012-086 — a CUSTOM activity (type 4) renders its `state`, not its `name`.
                // Sending the quote as `name` is why the status applied but the note never appeared.
                ...(presence.note !== undefined && presence.note !== ''
                  ? { activities: [{ name: 'Custom Status', type: 4, state: presence.note }] }
                  : {}),
              });
            },
          });
        },
        deployCommands: async (persona, botToken, registry) => {
          const rest = new REST({ version: '10' }).setToken(botToken);
          // UR-20261012-058 — the SAME split the main bot uses: core global, standard/marketplace to
          // the bound guild. See `splitPersonaPayloads` / `deployPersonaCommands`.
          return deployPersonaCommands(
            persona.discordApplicationId,
            persona.boundGuildId,
            splitPersonaPayloads(registry),
            async (route, body) => rest.put(route as `/${string}`, { body }),
          );
        },
        // UR-20261012-043 (A2.1) / UR-20261012-049 — a persona answers BOTH its slash commands and
        // its in-message controls, through the same adapters and the same registry the main bot uses,
        // with a router built over this persona's own filtered registry. Without the command half a
        // persona's commands were registered but dispatched by nothing.
        // UR-20261012-057 — register the framework icon set on the PERSONA'S application. An emoji
        // belongs to one application; without this her pages embedded the main bot's ids and every
        // icon rendered as the literal `:dumby_browse:`.
        ensureEmojis: async (persona, client) => {
          await ensureDefaultModuleEmoji(
            client as unknown as Client,
            logger,
            persona.discordApplicationId,
            collectModuleIcons(),
            await emojiLedger(),
          );
        },
        // UR-20261012-083 — clearing a persona's commands: the SAME split and the SAME put the deploy
        // uses, with EMPTY payloads, because `deployPersonaCommands` clears both scopes before it
        // writes — so an empty set is exactly a deregister.
        clearCommands: async (persona, botToken) => {
          const rest = new REST({ version: '10' }).setToken(botToken);
          return deployPersonaCommands(
            persona.discordApplicationId,
            persona.boundGuildId,
            { global: [], guild: [] },
            async (route, body) => rest.put(route as `/${string}`, { body }),
          );
        },
        // item 2 (follow-up) — the persona's OWN BCCM batch push. Her `/queue` writes renames to HER
        // application scope, which the main bot's push deliberately ignores, so without this they sit
        // `pending` forever. Same store and ceiling as the main bot — but HER token, HER application
        // and HER scope.
        runBccmPush: async (persona, botToken) => {
          const rest = new REST({ version: '10' }).setToken(botToken);
          const applicationId = persona.discordApplicationId;
          await runBccmBatchPush({
            store: bccmStore,
            logger,
            ceiling: commandCeiling,
            dryRun: config.get('BCCM_BATCH_PUSH_DRY_RUN'),
            applicationId,
            discord: {
              getRegistered: async (guildId) =>
                (await rest.get(
                  `/applications/${applicationId}/guilds/${guildId}/commands`,
                )) as readonly { name: string }[],
              putCommands: async (guildId, commands) => {
                await rest.put(`/applications/${applicationId}/guilds/${guildId}/commands`, {
                  body: commands,
                });
              },
            },
          });
        },
        createInteractionHandler: (persona, registry) => {
          // Built ONCE per persona, then remembered: her controls arrive through the shared component
          // registry, which finds her router by application id. Without this, a control on her page
          // re-dispatched through the main bot's router and rendered as the main bot.
          const personaRouter = new CommandRouter(
            registry,
            logger,
            commandRouterOptions(
              persona.id,
              persona.boundGuildId,
              persona.name,
              persona.accent,
              // item 2 — the persona's own application id is her BCCM scope.
              persona.discordApplicationId,
            ),
          );
          personaRouters.set(persona.discordApplicationId, personaRouter);
          return buildPersonaInteractionHandler({
            registry: interactionRegistry,
            createCommandRouter: () => personaRouter,
            logger,
          });
        },
        logger,
      });
      personaRuntimeRef = personaRuntime;
      const results = await personaRuntime.start();
      logger.info(
        `persona-runtime-start-complete hosted=${results.filter((r) => r.started).length} of ${results.length}`,
      );
    }
    const rest = new REST({ version: '10' }).setToken(config.get('BOT_TOKEN'));
    // §17.7 — the BCCM batch push's Discord surface. `getRegistered` is the authority for what
    // "new" means; `putCommands` is the idempotent bulk overwrite of the guild's command set.
    bccmDiscordClient = {
      getRegistered: async (guildId) =>
        (await rest.get(Routes.applicationGuildCommands(applicationId, guildId))) as {
          name: string;
        }[],
      putCommands: async (guildId, commands) => {
        // UR-20261011-023 — Discord's bulk overwrite needs a FULL command object (a `name` AND a
        // `description`); a body of `{ name }` alone is rejected, which is what made the first real
        // BCCM push fail with `bccm-batch-put-failed` and `sent=0`. Resolve each desired name to its
        // registered definition, keeping the requested name (a rename target is not a registry key,
        // so it falls back to a minimal valid object and is logged).
        const body = resolveCommandPayloads(
          commands.map((command) => command.name),
          commandRegistry,
          // UR-20261012-027 — self-describing (UR-019): the operator's log viewer renders only the
          // message, so the dropped command's name and reason travel in the string, not only in the
          // structured fields. A name dropped here is a rename/alias target that is not a valid
          // Discord command name, so the rename silently did not happen — this is the only record.
          (name, reason) =>
            logger.warn(`bccm-batch-command-skipped: ${name} (${reason})`, {
              guildId,
              name,
              reason,
            }),
          // UR-20261012-044 — a rename target inherits its source command's definition, so a renamed
          // command carries a real description rather than one repeating its own name.
          new Map(
            commands
              .filter((command) => command.source !== undefined)
              .map((command) => [command.name, command.source as string]),
          ),
        );
        await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body });
      },
    };
    // UR-20261011-011 — the instant command-access override: on a module disable, write a DENY
    // override for `@everyone` on each of the module's registered commands, so they disappear from
    // members' effective access at once while the deregistration stays batched (§17.6/§17.7).
    // Enabling clears the override (allow).
    setModuleCommandAccess = async (moduleId, guildId, allowed) => {
      const entry = moduleRegistry.get(moduleId);
      if (entry === undefined) return;
      const names = new Set(entry.manifest.commands.map((command) => command.name));
      if (names.size === 0) return;

      // UR-20261012-030 — a module's commands belong to the application that OWNS the module in this
      // guild: the persona bound to it, else the resident main bot. Both the read endpoint and the
      // token are per-application, so the owner decides both.
      const ownerPersonaId = await personaBindingService.resolveCommandOwner(guildId, moduleId);
      // 'main' (enabled-but-unbound) and 'shared' (core/admin) are sentinels, not persona ids
      // (see resolveCommandOwner). Feeding them to the UUID-typed persona_identities.id column
      // throws `invalid input syntax for type uuid`; fall through to the main bot's applicationId.
      const isPersonaOwner =
        ownerPersonaId !== undefined && ownerPersonaId !== 'main' && ownerPersonaId !== 'shared';
      const ownerPersona = isPersonaOwner
        ? await personaIdentities.findById(ownerPersonaId)
        : undefined;
      const ownerApplicationId = ownerPersona?.discordApplicationId ?? applicationId;
      if (ownerApplicationId === '') return;

      let registered: Array<{ id: string; name: string }>;
      try {
        registered = (await rest.get(
          Routes.applicationGuildCommands(ownerApplicationId, guildId),
        )) as Array<{ id: string; name: string }>;
      } catch (err) {
        logger.warn('command-access-read-failed', { moduleId, guildId, error: String(err) });
        return;
      }
      // §17.6 — the instant override (Server Settings → Integrations) needs a Bearer token; the
      // token/Bearer mechanics live in `command-access.ts` so they are unit-tested. UR-20261011-020
      // — prefer the dashboard-authorized token FOR THIS APPLICATION, fall back to the operator's
      // static env token (the main bot only), and absent both use Route B below.
      const storedToken = await commandPermissionTokens.resolveAccessToken(
        ownerApplicationId,
        guildId,
      );
      const bearer =
        storedToken ??
        (ownerPersona === undefined ? config.get('DISCORD_COMMAND_PERMISSIONS_TOKEN') : undefined);
      const applied = await setGuildCommandPermissions({
        token: bearer ?? '',
        applicationId: ownerApplicationId,
        guildId,
        registered,
        commandNames: names,
        allowed,
        logger,
      });
      // UR-20261012-030 (Route B) — with no user token, a DISABLE still hides at once by removing the
      // guild commands with the OWNER's own bot token, which needs no authorization at all. The BCCM
      // re-creates them on the next enable, the batched path it already owns.
      let removed = 0;
      if (applied === 0 && !allowed) {
        // Never throws: an unreadable token degrades to '' and deleteGuildCommands reports it, so
        // the disable still completes through the queued BCCM deregistration.
        const ownerBotToken =
          ownerPersona === undefined
            ? config.get('BOT_TOKEN')
            : openBotTokenOrEmpty(ownerPersona.botTokenSealed, personaRootKey);
        removed = await deleteGuildCommands({
          botToken: ownerBotToken,
          applicationId: ownerApplicationId,
          guildId,
          registered,
          commandNames: names,
          logger,
        });
      }
      // The log viewer drops structured fields, so the outcome is in the message too (UR-019 pattern).
      logger.info(`module-command-access-set applied=${applied} removed=${removed}`, {
        moduleId,
        guildId,
        allowed,
        applied,
        removed,
        applicationId: ownerApplicationId,
      });
    };
    // §17.7 — run the batch once shortly after boot: it converges any batch left pending by the
    // previous deploy, and in dry-run it makes the output visible without waiting for the 12h
    // cycle. Unref'd so it never holds the process open.
    const pushNow = async (applicationId: string): Promise<void> => {
      await runBccmBatchPush({
        store: bccmStore,
        logger,
        ceiling: commandCeiling,
        discord: bccmDiscordClient as BccmDiscordClient,
        dryRun: config.get('BCCM_BATCH_PUSH_DRY_RUN'),
        applicationId,
      });
    };
    // The install/uninstall paths, defined far above, reconcile through this.
    pushBccmNow = pushNow;
    setTimeout(() => {
      void pushNow(commandRegistry.profile.applicationId);
    }, 30_000).unref();
    const commandDeployer = new CommandDeployer({
      // UR-20261012-063 — the applied renames, so a boot registers the RENAMED set instead of reverting
      // every BCCM rename back to the registry's name.
      commandRenames: async (guildId: string) => {
        const map = new Map<string, string>();
        try {
          const rows = (await db
            .knex('guild_command_renames')
            .where({ guildId, applicationId: commandRegistry.profile.applicationId })
            .whereNull('deletedAt')
            .select<{ commandKey: string; newName: string }[]>('commandKey', 'newName')) as Array<{
            commandKey: string;
            newName: string;
          }>;
          for (const row of rows) map.set(String(row.commandKey), String(row.newName));
        } catch (err) {
          logger.warn(`command-renames-read-failed guild=${guildId} reason=${String(err)}`);
        }
        return map;
      },
      registry: commandRegistry,
      logger,
      config: {
        botToken: config.get('BOT_TOKEN'),
        applicationId,
        devGuildId: config.get('DEV_GUILD_ID'),
        nodeEnv: config.get('NODE_ENV'),
      },
      rest,
      // UR-20261021-095 — the guilds the bot is in, so the deploy clears EVERY one of them and a stale
      // registration cannot survive beside the current set.
      guildIds: async () => [...(discordClient?.guilds?.cache?.keys() ?? [])],
      enabledGuildResolver: async (moduleSlug) => {
        const tier = moduleRegistry.get(moduleSlug)?.manifest.tier ?? 'marketplace';
        const explicit = await db
          .knex('guild_module_states')
          .select<{ guildId: string }[]>('guildId')
          .where({ moduleSlug, enabled: true, state: 'active' })
          .whereNull('deletedAt');

        /**
         * §13 / UR-20261012-061 — OWNERSHIP decides too.
         *
         * A standard/marketplace module belongs to ONE profile in a guild: whoever claimed it first.
         * This deployer is the MAIN bot's, so a guild where a persona holds the module is NOT one the
         * main bot may register it in — otherwise two bots offer the same command and the member sees
         * the one that will refuse. An unclaimed module answers 'main', which is this deployer's own
         * identity, so it stays included.
         */
        const heldByAnother = async (guildId: string): Promise<boolean> => {
          const owner = await personaBindingService.resolveCommandOwner(guildId, moduleSlug);
          // 'main' is this deployer's own identity; 'shared' is a core/admin module, which belongs to
          // nobody in particular. Only a NAMED persona makes a guild someone else's. Core never reaches
          // this resolver (it is global, not guild-scoped) — stated anyway, because the filter must not
          // depend on that being true.
          return owner !== undefined && owner !== 'main' && owner !== 'shared';
        };

        if (!defaultEnabledForTier(tier)) {
          const candidates = explicit.map((row) => row.guildId);
          const owned = await Promise.all(candidates.map(heldByAnother));
          return candidates.filter((_, index) => owned[index] !== true);
        }

        const disabledRows = await db
          .knex('guild_module_states')
          .select<{ guildId: string }[]>('guildId')
          .where({ moduleSlug })
          .where((builder) => builder.where('enabled', false).orWhereNot('state', 'active'))
          .whereNull('deletedAt');
        const disabled = new Set(disabledRows.map((row) => row.guildId));

        const allRows = await db.knex('guilds').select<{ id: string }[]>('id');
        const candidates = allRows.map((row) => row.id).filter((id) => !disabled.has(id));
        const owned = await Promise.all(candidates.map(heldByAnother));
        return candidates.filter((_, index) => owned[index] !== true);
      },
    });
    // Twelve tables foreign-key onto `guilds`, so every guild-scoped write needs the guild row to
    // exist first — and the deployer's enabled-guild resolver reads that table, so the guilds are
    // registered BEFORE the deploy. UR-20261011-023 — a guild that joins after boot gets its
    // commands immediately, rather than waiting for the next deploy.
    await registerKnownGuilds(discordClient, db, logger, (guildId) =>
      commandDeployer.deployForGuild(guildId),
    );
    // UR-20261011-024 — the command deploy runs in the BACKGROUND. Per-guild registration is
    // rate-limited (two bulk-overwrite calls per guild) and was blocking readiness for minutes on
    // every restart. The gateway connection is independent of command deployment, so the bot is
    // functional while its commands propagate; a failure is logged, never fatal.
    void commandDeployer.deploy().catch((err: unknown) => {
      logger.error('command-deploy-failed', {
        error: String(err),
        applicationId,
        devGuildId: config.get('DEV_GUILD_ID'),
      });
    });

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
    // UR-20261012-073 — a completed OAuth leg is the only honest proof a persona's redirect URI is
    // registered; record it so the persona page can report the state instead of guessing.
    oauthDeps: oauth2Client.isConfigured()
      ? {
          client: oauth2Client,
          logger,
          defaultGuildId: config.get('DEV_GUILD_ID'),
          applicationId: discordClient?.application?.id ?? '',
          installPermissions: config.get('BOT_INSTALL_PERMISSIONS'),
          tokens: commandPermissionTokens,
          // UR-20261012-030 — a persona authorizes through its own application.
          personaClients: (appId) => personaOAuth.clientForApplication(appId),
          // UR-20261012-073 — a completed exchange proves the redirect URI is registered.
          markOauthVerified: (appId) => personaIdentities.markOauthVerified(appId),
        }
      : undefined,
    // UR-20261012-034 — optionally serve the Twill persona registration API here, so it is usable
    // without provisioning a separate Railway service. OFF by default; it stays behind the internal
    // API key either way.
    twillPersonaDeps: config.get('TWILL_ROUTES_ON_API')
      ? {
          service: personaBindingService,
          identities: personaIdentities,
          bindings: personaBindings,
          registrars: personaRegistrars,
          rootKey: personaRootKey,
          // UR-20261012-052 — so a binding for a module this guild has DISABLED is refused at the
          // surface, instead of producing a registered-but-refused command.
          isModuleEnabledInGuild,
          // UR-20261012-082 — so a presence set through Twill reaches the RUNNING persona, rather
          // than waiting for the next restart.
          applyPersonaPresence: (personaId, presence) =>
            personaRuntimeRef?.applyPresence(personaId, presence) ?? false,
          // UR-20261012-083 — a revoke stops the running persona, so the delete takes effect NOW
          // rather than at the next restart.
          stopPersona: async (persona) =>
            (await personaRuntimeRef?.stopPersona(persona as never)) ?? false,
          // UR-20261012-085 — a registration, a binding or a credential change takes effect NOW.
          reloadPersona: async (persona) =>
            (await personaRuntimeRef?.reloadPersona(persona as never)) ?? undefined,
          logger,
          costSignals: { dedicatedInfrastructureRequired: false, perPersonaCostMeasurable: false },
        }
      : undefined,
    // UR-20261021-095 / Option 3 — optionally serve the module deploy surface here, so the
    // upload/approve/deploy/reload pathway is reachable without the boot seed. OFF by default; the
    // `/internal/` prefix stays behind the internal API key either way.
    deployDeps: config.get('SWASTIK_DEPLOY_ON_API')
      ? {
          knex: db.knex,
          stagingVolume: config.get('SWASTIK_STAGING_VOLUME_PATH'),
          modulesDir: config.get('MODULES_DIR'),
          lockStore,
          signingKeyId: config.get('BUILD_SIGNING_KEY_ID'),
          signingPrivateKey: config.get('BUILD_SIGNING_PRIVATE_KEY'),
          logger,
          redact: (value: string) =>
            value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***',
          audit: async (
            action: string,
            outcome: 'allowed' | 'rejected',
            detail: Record<string, unknown>,
          ): Promise<void> => {
            await db.knex('audit_logs').insert({
              actorId: 'swastik',
              source: 'SWASTIK',
              reason: action,
              action,
              outcome,
              rejectionReason: outcome === 'rejected' ? String(detail['error'] ?? 'unknown') : null,
              metadata: JSON.stringify(detail),
            });
          },
          recordDeployment: async (input: {
            buildId: string;
            module: string;
            version: string;
            devId: string;
            promotionResult: 'promoted' | 'rolled-back' | 'not-attempted';
          }): Promise<void> => {
            try {
              const store = new PostgresDeploymentRecordStore(db.knex);
              await store.append(
                buildDeploymentRecord({
                  recordId: randomUUID(),
                  triggeredBy: { type: 'operator', initiatedBy: input.devId },
                  devId: input.devId,
                  buildId: input.buildId,
                  module: input.module,
                  version: input.version,
                  validationOutcome: 'passed',
                  gateOutcomes: { promotion: 'passed' },
                  promotionResult: input.promotionResult,
                }),
              );
            } catch (err) {
              logger.warn('deploy-record-failed', {
                buildId: input.buildId,
                error: String(err),
              });
            }
          },
        }
      : undefined,
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
