import type { ClientEvents } from 'discord.js';
import type { Logger } from '../logging/logger.js';
import type { CacheManager } from '../cache/cache-manager.js';

export interface IEventHandler {
  event: keyof ClientEvents;
  once?: boolean;
  handle(...args: unknown[]): Promise<void>;
}

export interface EventRouterDeps {
  logger: Logger;
  cache: CacheManager;
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

  async dispatch(event: string, ...args: unknown[]): Promise<void> {
    const handlers = this.handlers.get(event) ?? [];
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
