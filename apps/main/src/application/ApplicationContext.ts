import type { FastifyInstance } from 'fastify';
import type { Client } from 'discord.js';
import type { Logger } from '../logging/logger.js';
import type { MetricsRegistry } from '../metrics/registry.js';
import type { ConfigService } from '../config/config.service.js';
import type { DbClient } from '../db/client.js';
import type { CacheManager } from '../cache/cache-manager.js';
import type { QueueManager } from '../queue/queue-manager.js';
import type { ModuleLoader } from '../module-system/loader.js';
import type { CommandRegistry } from '../commands/command-registry.js';
import type { CommandRouter } from '../commands/command-router.js';
import type { InternalEventBus } from '../events/event-bus.js';
import type { PermissionResolver } from '../permissions/resolver.js';
import type { ModuleRegistry } from '../module-system/registry.js';
import type { Container } from '../di/container.js';
import type { Redis } from 'ioredis';
import type { InFlightTracker } from '../shutdown/in-flight-tracker.js';
import type { CoreRenderer } from '../rendering/core-renderer.js';
import type { InteractionRegistry } from '../interactions/interaction-registry.js';

export interface ApplicationContext {
  container: Container;
  moduleContainer: Container;
  logger: Logger;
  config: ConfigService;
  metrics: MetricsRegistry;
  db: DbClient;
  redis: Redis;
  queueRedis: Redis;
  cache: CacheManager;
  queue: QueueManager;
  eventBus: InternalEventBus;
  moduleRegistry: ModuleRegistry;
  moduleLoader: ModuleLoader;
  permissionResolver: PermissionResolver;
  commandRegistry: CommandRegistry;
  commandRouter: CommandRouter;
  renderer: CoreRenderer;
  interactionRegistry: InteractionRegistry;
  apiServer: FastifyInstance;
  healthServer: FastifyInstance;
  metricsServer: FastifyInstance;
  discordClient?: Client;
  inFlightTracker: InFlightTracker;
  loadOrder: readonly string[];
}

export function createApplicationContext(values: ApplicationContext): ApplicationContext {
  return Object.freeze({ ...values });
}
