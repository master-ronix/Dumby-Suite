import type { InternalEventBus } from '../events/event-bus.js';
import type { Logger } from '../logging/logger.js';
import type { GlobalDataDelivery, GlobalDataEmit, JsonValue } from '@workspace/swastik';

/**
 * The global data emit channel — the ONE sanctioned way a module shares data with another.
 *
 * POLICY (operator directive, 2026-10-27): every module is isolated. No module calls another module,
 * no module imports another module's code, and no module subscribes to another module's internal
 * events. If two modules must share something, they share DATA on this channel.
 *
 * Two properties make that structural rather than a convention:
 *
 * 1. **It carries data, not behaviour.** The payload is validated as JSON before it is published, so
 *    a function, a class instance, a database client or any other handle cannot travel through it.
 *    A module cannot hand another module a capability it does not hold.
 * 2. **It is one-way and attributed.** The delivery is stamped with the emitting module by the
 *    framework; a subscriber sees `{source, topic, payload}` and can never address the emitter back.
 *
 * The channel is built on the internal event bus under the reserved `global.data.<topic>` namespace.
 * The bus itself is not a capability any non-core tier holds, so a Standard or Marketplace module can
 * reach the shared channel and cannot reach the bus underneath it.
 */

const TOPIC_PATTERN = /^[a-z][a-z0-9-]*$/;
const RESERVED_TOPIC_PREFIX = 'global.data.';

export class GlobalDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlobalDataError';
  }
}

/** Is `value` JSON — no functions, no class instances, no cycles, no handles? */
export function isJsonValue(value: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
  if (value === null) return true;
  const kind = typeof value;
  if (kind === 'string' || kind === 'number' || kind === 'boolean') return true;
  if (kind !== 'object') return false;
  if (seen.has(value as object)) return false;
  seen.add(value as object);
  if (Array.isArray(value)) return value.every((entry) => isJsonValue(entry, seen));
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value as Record<string, unknown>).every((entry) => isJsonValue(entry, seen));
}

export interface GlobalDataEmitOptions {
  readonly bus: InternalEventBus;
  readonly logger: Logger;
}

/**
 * The channel when the event bus is not registered (a partial boot, or a unit test). It refuses
 * loudly rather than accepting data it would silently drop: a module that believes it shared
 * something must not be told a lie.
 */
export function makeUnavailableGlobalData(moduleId: string): GlobalDataEmit {
  const refuse = (): never => {
    throw new GlobalDataError(
      `Module "${moduleId}" used the global data emit channel before the event bus was registered.`,
    );
  };
  return { emit: refuse, on: refuse };
}

export function makeGlobalDataEmit(
  moduleId: string,
  options: GlobalDataEmitOptions,
): GlobalDataEmit {
  const { bus, logger } = options;

  const eventName = (topic: string): string => {
    if (!TOPIC_PATTERN.test(topic)) {
      throw new GlobalDataError(
        `Invalid global data topic "${topic}": use one lowercase segment matching ` +
          `${TOPIC_PATTERN.source} (the framework namespaces it as ${RESERVED_TOPIC_PREFIX}<topic>).`,
      );
    }
    return `${RESERVED_TOPIC_PREFIX}${topic}`;
  };

  return {
    emit(topic: string, payload: JsonValue): void {
      const name = eventName(topic);
      if (!isJsonValue(payload)) {
        throw new GlobalDataError(
          `Module "${moduleId}" emitted a non-JSON payload on topic "${topic}". The global data ` +
            `channel carries data only — no functions, class instances, handles or cycles.`,
        );
      }
      const delivery: GlobalDataDelivery = { source: moduleId, topic, payload };
      void bus.emit(name, delivery).catch((err: unknown) => {
        logger.warn('global-data-emit-failed', { moduleId, topic, error: String(err) });
      });
    },

    on(topic: string, handler: (delivery: GlobalDataDelivery) => void): () => void {
      const name = eventName(topic);
      return bus.on<GlobalDataDelivery>(name, (delivery) => {
        // Defence in depth: a delivery that does not carry this topic is not ours to hand over.
        if (delivery === null || typeof delivery !== 'object' || delivery.topic !== topic) return;
        handler(delivery);
      });
    },
  };
}
