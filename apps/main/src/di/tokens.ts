import { createToken } from './container.js';
import type { Logger } from '../logging/logger.js';
import type { ConfigService } from '../config/config.service.js';
import type { InternalEventBus } from '../events/event-bus.js';
import type { CacheManager } from '../cache/cache-manager.js';
import type { QueueManager } from '../queue/queue-manager.js';
import type { ModuleRegistry } from '../module-system/registry.js';
import type { PermissionResolver } from '../permissions/resolver.js';
import type { MetricsRegistry } from '../metrics/registry.js';
import type { DbClient } from '../db/client.js';
import type { CommandRegistry } from '../commands/command-registry.js';
import type { CommandRouter } from '../commands/command-router.js';
import type { CommandCeilingService } from '../commands/command-ceiling.js';
import type { CollisionResolutionService } from '../commands/collision-resolution.js';
import type { CoreRenderer } from '../rendering/core-renderer.js';
import type { InteractionRegistry } from '../interactions/interaction-registry.js';
import type { PersonaCommandBindingService } from '../personas/persona-command-binding.service.js';

/**
 * CORE_TOKENS is the frozen namespace: after bootstrap Stage 09
 * (DI_BOOTSTRAP) the root container is frozen, so nothing — including a
 * misbehaving module — can re-register any of these.
 */
export const CORE_TOKENS = {
  Logger: createToken<Logger>('core.Logger'),
  Config: createToken<ConfigService>('core.Config'),
  Db: createToken<DbClient>('core.Db'),
  EventBus: createToken<InternalEventBus>('core.EventBus'),
  Cache: createToken<CacheManager>('core.Cache'),
  Queue: createToken<QueueManager>('core.Queue'),
  ModuleRegistry: createToken<ModuleRegistry>('core.ModuleRegistry'),
  PermissionResolver: createToken<PermissionResolver>('core.PermissionResolver'),
  Metrics: createToken<MetricsRegistry>('core.Metrics'),
  CommandRegistry: createToken<CommandRegistry>('core.CommandRegistry'),
  CommandRouter: createToken<CommandRouter>('core.CommandRouter'),
  Renderer: createToken<CoreRenderer>('core.Renderer'),
  InteractionRegistry: createToken<InteractionRegistry>('core.InteractionRegistry'),
  CommandCeilingService: createToken<CommandCeilingService>('core.CommandCeilingService'),
  CollisionResolutionService: createToken<CollisionResolutionService>(
    'core.CollisionResolutionService',
  ),
  Personas: createToken<PersonaCommandBindingService>('core.Personas'),
} as const;

/**
 * Builds a module-scoped token namespace, e.g. `moduleTokens('utility')`
 * produces a factory for tokens whose description is prefixed
 * `module.utility.*`, preventing accidental collisions between two
 * modules that both want to call their service "Service".
 */
export function moduleTokenNamespace(moduleId: string) {
  return {
    token<T>(name: string) {
      return createToken<T>(`module.${moduleId}.${name}`);
    },
  };
}
