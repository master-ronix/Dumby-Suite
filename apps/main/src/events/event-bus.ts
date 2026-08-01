/**
 * Internal event bus for domain events (Cluster: Bags). Used for the
 * {domain}.{entity}.{action} events emitted by services/modules (e.g.
 * "dumby.system.ready", "economy.selftest.executed"). A separate adapter
 * translating MockGatewayAdapter's gateway-shaped events onto this same
 * bus is listed as a follow-up in STATUS_AND_VERIFICATION.md rather than
 * included in this delivery.
 *
 * Dependency: only `node:async_hooks` (a Node built-in), so this is fully
 * unit-testable without installing anything.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { EventCycleError } from '../errors/taxonomy.js';

export const EVENT_NAME_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2}$/;

export function isValidEventName(name: string): boolean {
  return EVENT_NAME_PATTERN.test(name);
}

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;
export type WildcardHandler = (envelope: {
  eventName: string;
  payload: unknown;
}) => void | Promise<void>;

interface Subscription {
  id: number;
  eventName: string | null;
  priority: number;
  once: boolean;
  handler: EventHandler | WildcardHandler;
}

export interface EmitOptions {
  /** Whether this particular emission is allowed to be dropped under event-loop lag. */
  sheddable?: boolean;
}

export interface EventBusOptions {
  maxEmitDepth?: number;
  onSubscriberError?: (err: unknown, eventName: string) => void;
}

interface EmitContext {
  chain: readonly string[];
}

/**
 * Domains that must NEVER be shed even if the caller marks the emission as
 * sheddable and the event loop is lagged — moderation/safety/consistency
 * critical paths.
 */
const NON_SHEDDABLE_PREFIXES = ['moderation.', 'automod.', 'verification.', 'cache.'];

export function isProtectedEventDomain(eventName: string): boolean {
  return NON_SHEDDABLE_PREFIXES.some((p) => eventName.startsWith(p));
}

export class InternalEventBus {
  private subs: Subscription[] = [];
  private nextId = 1;
  private readonly maxEmitDepth: number;
  private readonly als = new AsyncLocalStorage<EmitContext>();
  private readonly onSubscriberError: ((err: unknown, eventName: string) => void) | undefined;
  private cycleDetectedCount = 0;

  constructor(options: EventBusOptions = {}) {
    this.maxEmitDepth = options.maxEmitDepth ?? 20;
    this.onSubscriberError = options.onSubscriberError ?? undefined;
  }

  on<T = unknown>(eventName: string, handler: EventHandler<T>, priority = 0): () => void {
    assertValidEventName(eventName);
    return this.subscribe({ eventName, handler: handler as EventHandler, priority, once: false });
  }

  once<T = unknown>(eventName: string, handler: EventHandler<T>, priority = 0): () => void {
    assertValidEventName(eventName);
    return this.subscribe({ eventName, handler: handler as EventHandler, priority, once: true });
  }

  onAny(handler: WildcardHandler, priority = 0): () => void {
    return this.subscribe({ eventName: null, handler, priority, once: false });
  }

  private subscribe(partial: Omit<Subscription, 'id'>): () => void {
    const sub: Subscription = { id: this.nextId++, ...partial };
    this.subs.push(sub);
    return () => {
      this.subs = this.subs.filter((s) => s.id !== sub.id);
    };
  }

  async emit<T = unknown>(
    eventName: string,
    payload: T,
    _options: EmitOptions = {},
  ): Promise<void> {
    assertValidEventName(eventName);

    const parent = this.als.getStore();
    const chain = parent ? [...parent.chain, eventName] : [eventName];

    if (chain.length > this.maxEmitDepth) {
      this.cycleDetectedCount += 1;
      throw new EventCycleError(chain);
    }

    await this.als.run({ chain }, async () => {
      const targeted = this.subs
        .filter((s) => s.eventName === eventName)
        .sort((a, b) => b.priority - a.priority);
      const wildcard = this.subs
        .filter((s) => s.eventName === null)
        .sort((a, b) => b.priority - a.priority);

      for (const sub of targeted) {
        await this.invoke(sub, () => (sub.handler as EventHandler)(payload), eventName);
      }
      for (const sub of wildcard) {
        await this.invoke(
          sub,
          () => (sub.handler as WildcardHandler)({ eventName, payload }),
          eventName,
        );
      }
    });
  }

  private async invoke(
    sub: Subscription,
    call: () => void | Promise<void>,
    eventName: string,
  ): Promise<void> {
    try {
      await call();
    } catch (err) {
      if (this.onSubscriberError) {
        this.onSubscriberError(err, eventName);
      } else {
        throw err;
      }
    } finally {
      if (sub.once) {
        this.subs = this.subs.filter((s) => s.id !== sub.id);
      }
    }
  }

  getCycleDetectedCount(): number {
    return this.cycleDetectedCount;
  }

  listenerCount(eventName: string): number {
    return this.subs.filter((s) => s.eventName === eventName).length;
  }

  removeAllListeners(): void {
    this.subs = [];
  }
}

function assertValidEventName(name: string): void {
  if (!isValidEventName(name)) {
    throw new TypeError(
      `Invalid event name "${name}"; expected "{domain}.{entity}.{action}" (lowercase, dot-delimited, hyphens allowed within a segment).`,
    );
  }
}
