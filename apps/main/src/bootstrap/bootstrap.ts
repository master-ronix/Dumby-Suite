import { Container } from '../di/container.js';
import { CORE_TOKENS } from '../di/tokens.js';
import { parseEnv, pickEnvKeys, ConfigValidationError } from '../config/env.schema.js';
import { ConfigService } from '../config/config.service.js';
import { createLogger } from '../logging/logger.js';
import { MetricsRegistry } from '../metrics/registry.js';
import { DbClient } from '../db/client.js';
import { InternalEventBus } from '../events/event-bus.js';
import { CacheManager } from '../cache/cache-manager.js';
import { RedisLockStore } from '../cache/redis-lock-store.js';
import { QueueManager } from '../queue/queue-manager.js';
import { ModuleRegistry } from '../modules/registry.js';
import { ModuleLoader } from '../modules/loader.js';
import { PermissionResolver } from '../permissions/resolver.js';
import { BootstrapProgress } from './stages.js';
import { buildApiServer, buildHealthServer, buildMetricsServer } from '../http/server.js';
import { PowerEngineDispatcher } from '../http/power-engine-dispatcher.js';
import { registerAllModules } from '../modules/register-all.js';
import { InFlightTracker } from '../shutdown/in-flight-tracker.js';
import { registerShutdownSignalHandlers, isAcceptingGatewayEvents } from '../shutdown/shutdown.js';
import { Redis } from 'ioredis';
import { CommandRegistry } from '../commands/command-registry.js';
import { CommandRouter } from '../commands/command-router.js';
import type { CommandInteraction } from '../commands/command-router.js';
import { Events, REST, type Client } from 'discord.js';
import { buildDiscordClient, computeIntentsBitfield, computePartials } from '../discord/client-builder.js';
import { LiveGatewayAdapter } from '../discord/gateway.live-adapter.js';
import { CommandDeployer } from '../commands/command-deployer.js';

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
  process.on('unhandledRejection', (reason) => {
     
    console.error('unhandledRejection', reason);
  });

  // Stage 02: CONFIG_LOAD
  progress.advanceTo('CONFIG_LOAD');
  let env;
  try {
    env = parseEnv(pickEnvKeys(process.env));
  } catch (err) {
    if (err instanceof ConfigValidationError) {
       
      console.error('Fatal: environment validation failed', err.fieldErrors);
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
    statementTimeoutMs: config.get('DATABASE_STATEMENT_TIMEOUT'),
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
  const moduleRegistry = new ModuleRegistry();
  const permissionResolver = new PermissionResolver();
  const commandRegistry = new CommandRegistry();
  const commandRouter = new CommandRouter(commandRegistry, logger);
  container.registerValue(CORE_TOKENS.EventBus, eventBus);
  container.registerValue(CORE_TOKENS.ModuleRegistry, moduleRegistry);
  container.registerValue(CORE_TOKENS.PermissionResolver, permissionResolver);
  container.registerValue(CORE_TOKENS.CommandRegistry, commandRegistry);
  container.registerValue(CORE_TOKENS.CommandRouter, commandRouter);
  container.freeze();

  // Stage 10: MODULE_DISCOVER
  progress.advanceTo('MODULE_DISCOVER');
  registerAllModules(moduleRegistry);

  // Stage 11: MODULE_VALIDATE
  progress.advanceTo('MODULE_VALIDATE');
  const moduleLoader = new ModuleLoader(moduleRegistry, container, logger);
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

    discordClient.on(Events.InteractionCreate, (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (!isAcceptingGatewayEvents()) return;
      void commandRouter.dispatch(interaction as unknown as CommandInteraction).catch(async (err) => {
        logger.error('interaction-dispatch-failed', { command: interaction.commandName, error: String(err) });
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'Something went wrong running that command.' });
          } else {
            await interaction.reply({ content: 'Something went wrong running that command.', ephemeral: true });
          }
        } catch (replyErr) {
          logger.error('interaction-error-reply-failed', { error: String(replyErr) });
        }
      });
    });

    const liveAdapter = new LiveGatewayAdapter(discordClient, config.get('BOT_TOKEN'), config.get('SHARD_COUNT'));
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
        devGuildId: config.get('DEVELOPMENT_GUILD_ID'),
        nodeEnv: config.get('NODE_ENV'),
      },
      rest,
    });
    await commandDeployer.deploy();
    logger.info('discord-client-ready', { applicationId, guildCount: discordClient.guilds.cache.size });
  }

  // Stage 17: MODULE_READY
  progress.advanceTo('MODULE_READY');
  await moduleLoader.readyAll(loadReport.order);
  progress.setRequiredModulesHealthy(loadReport.fatal.length === 0);

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
      dispatcher: new PowerEngineDispatcher({ trustedSources: config.get('PEP_TRUSTED_SOURCES') }, {
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
      }),
      db,
      config,
      auditWriter: {
        write: async (entry) => {
          await db.knex('audit_logs').insert(entry);
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

  logger.info('bootstrap-complete', { degradedModules: loadReport.degraded });
}
