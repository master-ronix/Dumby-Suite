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
import type { EventRouter } from '../events/event-router.js';
import type { Scheduler } from '../queue/scheduler.js';
import type { AdminEvalGate } from '../permissions/admin-eval-gate.js';
import type { DiscordOAuth2Client } from '../http/oauth/oauth2-client.js';
import type { MtpTokenCalculator } from '../analytics/mtp-token-calculator.js';

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
  EventRouter: createToken<EventRouter>('core.EventRouter'),
  Scheduler: createToken<Scheduler>('core.Scheduler'),
  AdminEvalGate: createToken<AdminEvalGate>('core.AdminEvalGate'),
  OAuth2: createToken<DiscordOAuth2Client>('core.OAuth2'),
  MtpTokens: createToken<MtpTokenCalculator>('core.MtpTokens'),
} as const;

export function moduleTokenNamespace(moduleId: string) {
  return {
    token<T>(name: string) {
      return createToken<T>(`module.${moduleId}.${name}`);
    },
  };
}
