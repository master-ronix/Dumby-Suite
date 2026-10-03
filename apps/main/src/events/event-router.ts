import type { ClientEvents } from 'discord.js';
import type { Logger } from '../logging/logger.js';
import type { CacheManager } from '../cache/cache-manager.js';
import type { EventLoopLagMonitor } from './event-loop-lag.js';
import type { MetricsRegistry } from '../metrics/registry.js';

export interface IEventHandler {
  event: keyof ClientEvents;
  once?: boolean;
  /** §16 — the author's declaration that a dropped instance violates no correctness requirement. */
  sheddable?: boolean;
  handle(...args: unknown[]): Promise<void>;
}

/**
 * §16 (UR-C-19) — "protected domains": event-name domains that are never shed regardless of lag —
 * anything feeding a moderation, auto-mod or verification decision, and anything that would itself
 * resolve a `guild_module_states` or `guild_configs` cache miss. The framework's two recommended
 * sheddable subscriptions (`typingStart`, `presenceUpdate`) match no protected domain.
 */
export const PROTECTED_EVENT_DOMAINS: readonly string[] = [
  'guildMember',
  'guildBan',
  'guild',
  'message',
];

export function isProtectedEventDomain(event: string): boolean {
  return PROTECTED_EVENT_DOMAINS.some((domain) => event.startsWith(domain));
}

export interface EventRouterDeps {
  logger: Logger;
  cache: CacheManager;
  /** §16 — when present, events tagged sheddable are dropped while the loop is over threshold. */
  lagMonitor?: EventLoopLagMonitor;
  /** §16 — a shed increments `dumby_gateway_events_shed_total`, tagged by event name. */
  metrics?: MetricsRegistry;
  isProtected?: (event: string) => boolean;
}

export class EventRouter {
  private readonly handlers = new Map<string, IEventHandler[]>();
  private readonly moduleHandlers = new Map<string, string>();

  constructor(private readonly deps: EventRouterDeps) {}

  register(handler: IEventHandler, moduleId: string): void {
    const event = handler.event;
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    this.moduleHandlers.set(`${moduleId}:${event}`, handler.event);
  }

  getHandlers(event: string): IEventHandler[] {
    return this.handlers.get(event) ?? [];
  }

  getRegisteredEvents(): string[] {
    return [...new Set([...this.handlers.keys()])];
  }

  /**
   * §16 — an event is shed only when the loop is over `EVENT_LOOP_LAG_SHED_THRESHOLD_MS`, every
   * handler for it is tagged `sheddable`, and it is not in the protected set.
   */
  private shouldShed(event: string, handlers: readonly IEventHandler[]): boolean {
    const monitor = this.deps.lagMonitor;
    if (monitor === undefined || handlers.length === 0) return false;
    const isProtected = this.deps.isProtected ?? isProtectedEventDomain;
    const allSheddable = handlers.every((handler) => handler.sheddable === true);
    return monitor.shouldShed(event, allSheddable, isProtected);
  }

  async dispatch(event: string, ...args: unknown[]): Promise<void> {
    const handlers = this.handlers.get(event) ?? [];
    if (this.shouldShed(event, handlers)) {
      this.deps.metrics?.gatewayEventsShedTotal.inc({ event_name: event });
      this.deps.logger.warn('gateway-event-shed', {
        event,
        lagMs: this.deps.lagMonitor?.getCurrentLagMs(),
      });
      return;
    }
    for (const handler of handlers) {
      try {
        await handler.handle(...args);
      } catch (err) {
        this.deps.logger.error('event-handler-error', {
          event,
          error: String(err),
        });
      }
    }
  }
}
