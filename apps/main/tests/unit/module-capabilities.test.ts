import { describe, test, expect } from 'vitest';
import { Container, createToken } from '../../src/di/container.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';
import {
  ModuleCapabilityDeniedError,
  capabilitiesForTier,
  capabilityOfToken,
  isPrivilegedTier,
  withModuleCapabilities,
} from '../../src/module-system/module-capabilities.js';
import {
  GlobalDataError,
  isJsonValue,
  makeGlobalDataEmit,
  makeUnavailableGlobalData,
} from '../../src/module-system/global-data-emit.js';
import { InternalEventBus } from '../../src/events/event-bus.js';
import { moduleTokenNamespace } from '../../src/di/tokens.js';
import type { Logger } from '../../src/logging/logger.js';
import type { GlobalDataDelivery, ModuleCapability } from '@workspace/swastik';

const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 5));
};

const logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as unknown as Logger;

function buildContainer(): Container {
  const container = new Container();
  container.register(CORE_TOKENS.Logger, () => logger);
  container.register(CORE_TOKENS.Config, () => ({ get: () => 'x' }));
  container.register(CORE_TOKENS.Db, () => ({ knex: 'the-database' }));
  container.register(CORE_TOKENS.CommandRegistry, () => ({ list: () => [] }));
  container.register(CORE_TOKENS.Scheduler, () => ({ register: () => {} }));
  container.register(CORE_TOKENS.EventBus, () => new InternalEventBus());
  return container;
}

const globalData = makeUnavailableGlobalData('test-module');

function runtimeFor(tier: 'core' | 'admin' | 'standard' | 'marketplace', moduleId = 'hello-world') {
  return withModuleCapabilities(buildContainer(), { moduleId, tier, globalData });
}

describe('the tier decides the capability surface', () => {
  test('core and admin are the privileged tiers; standard and marketplace are not', () => {
    expect(isPrivilegedTier('core')).toBe(true);
    expect(isPrivilegedTier('admin')).toBe(true);
    expect(isPrivilegedTier('standard')).toBe(false);
    expect(isPrivilegedTier('marketplace')).toBe(false);
  });

  test('a standard module holds the baseline and none of the core-only capabilities', () => {
    const granted = capabilitiesForTier('standard');
    expect(granted).toContain('logging');
    expect(granted).toContain('global.data.emit');
    expect(granted).not.toContain('data.sql');
    expect(granted).not.toContain('commands.registry');
    expect(granted).not.toContain('process.schedule');
    expect(granted).not.toContain('events.bus');
  });

  test('a core module holds the core-only capabilities', () => {
    const granted = capabilitiesForTier('core');
    expect(granted).toContain('data.sql');
    expect(granted).toContain('commands.registry');
    expect(granted).toContain('process.schedule');
    expect(granted).toContain('events.bus');
  });

  test('every core token maps to a capability, so none is reachable by default', () => {
    expect(capabilityOfToken(CORE_TOKENS.Db as never)).toBe('data.sql');
    expect(capabilityOfToken(CORE_TOKENS.CommandRegistry as never)).toBe('commands.registry');
    expect(capabilityOfToken(CORE_TOKENS.Logger as never)).toBe('logging');
    // An unmapped token is unreachable by every tier rather than silently allowed.
    expect(capabilityOfToken(createToken('not.a.core.token') as never)).toBeNull();
  });
});

describe('the guarded container refuses what the tier does not hold', () => {
  test('a standard module cannot resolve the database', () => {
    const runtime = runtimeFor('standard');
    expect(() => runtime.resolve(CORE_TOKENS.Db)).toThrow(ModuleCapabilityDeniedError);
  });

  test('a standard module cannot resolve the command registry — the privileged surface', () => {
    const runtime = runtimeFor('standard');
    expect(() => runtime.resolve(CORE_TOKENS.CommandRegistry)).toThrow(ModuleCapabilityDeniedError);
  });

  test('a standard module cannot reach the scheduler or the internal event bus', () => {
    const runtime = runtimeFor('standard');
    expect(() => runtime.tryResolve(CORE_TOKENS.Scheduler)).toThrow(ModuleCapabilityDeniedError);
    expect(() => runtime.tryResolve(CORE_TOKENS.EventBus)).toThrow(ModuleCapabilityDeniedError);
  });

  test('a standard module resolves what it does hold', () => {
    const runtime = runtimeFor('standard');
    expect(runtime.resolve(CORE_TOKENS.Logger)).toBe(logger);
    expect(runtime.hasCapability('logging')).toBe(true);
    expect(runtime.hasCapability('data.sql')).toBe(false);
  });

  test('a core module resolves the core base it owns', () => {
    const runtime = runtimeFor('core');
    expect(runtime.resolve(CORE_TOKENS.Db)).toEqual({ knex: 'the-database' });
    expect(runtime.hasCapability('data.sql')).toBe(true);
  });

  test('the refusal names the module, its tier and the capability', () => {
    const runtime = runtimeFor('marketplace', 'third-party-fun');
    let error: unknown;
    try {
      runtime.resolve(CORE_TOKENS.Db);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(ModuleCapabilityDeniedError);
    const denied = error as ModuleCapabilityDeniedError;
    expect(denied.moduleId).toBe('third-party-fun');
    expect(denied.tier).toBe('marketplace');
    expect(denied.capability).toBe('data.sql');
    expect(denied.message).toContain('global data emit');
  });

  test('a module cannot register into the core container', () => {
    const runtime = runtimeFor('standard');
    expect(() => runtime.register(CORE_TOKENS.Db, () => ({}) as never)).toThrow(
      ModuleCapabilityDeniedError,
    );
  });

  test('a module may register into its own namespace and not another module’s', () => {
    const runtime = runtimeFor('standard', 'hello-world');
    const own = moduleTokenNamespace('hello-world').token<{ ok: boolean }>('cache');
    const foreign = moduleTokenNamespace('queue').token<{ ok: boolean }>('cache');
    expect(() => runtime.register(own, () => ({ ok: true }))).not.toThrow();
    expect(runtime.resolve(own)).toEqual({ ok: true });
    expect(() => runtime.register(foreign, () => ({ ok: true }))).toThrow(
      ModuleCapabilityDeniedError,
    );
  });

  test('a non-privileged module cannot freeze or fork the root container', () => {
    const runtime = runtimeFor('standard');
    expect(() => runtime.freeze()).toThrow(ModuleCapabilityDeniedError);
    expect(() => runtime.createChild()).toThrow(ModuleCapabilityDeniedError);
  });

  test('a core module keeps the whole container', () => {
    const runtime = runtimeFor('core');
    expect(() => runtime.freeze()).not.toThrow();
    expect(runtime.isFrozen()).toBe(true);
  });

  test('the runtime exposes the capabilities it holds', () => {
    const runtime = runtimeFor('standard');
    expect(runtime.moduleId).toBe('hello-world');
    expect(runtime.tier).toBe('standard');
    expect(runtime.capabilities).toContain('global.data.emit' as ModuleCapability);
  });
});

// UR-20261030-118 — registration is a GRANT, not a reach. `provides` has been in the manifest schema
// since the beginning and was never wired: a module could register into any token its tier allowed,
// and nothing recorded that it was the provider of that contract.
describe('a module registers only the services its manifest declares', () => {
  test('an undeclared shared token is refused, even when the tier may resolve it', () => {
    const runtime = withModuleCapabilities(buildContainer(), {
      moduleId: 'health',
      tier: 'core',
      globalData,
    });
    // Core tier can RESOLVE everything; that is not permission to PROVIDE.
    expect(() => runtime.register(CORE_TOKENS.Db, () => ({}) as never)).toThrow();
  });

  test('a declared token is registrable, and resolvable afterwards', () => {
    const container = makeContainer();
    const runtime = withModuleCapabilities(container, {
      moduleId: 'persona',
      tier: 'core',
      globalData,
      provides: ['core.PersonaService'],
    });
    const token = { name: 'core.PersonaService', __type: undefined } as never;
    expect(() => runtime.register(token, () => ({ ok: true }) as never)).not.toThrow();
    expect(container.resolve(token)).toEqual({ ok: true });
  });
});

describe('the global data emit channel is the only way modules share', () => {
  test('a delivery is stamped with its source and carries the payload', async () => {
    const bus = new InternalEventBus();
    const emit = makeGlobalDataEmit('health', { bus, logger });
    const seen: GlobalDataDelivery[] = [];
    emit.on('uptime', (delivery) => seen.push(delivery));
    emit.emit('uptime', { seconds: 42 });
    await flush();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.source).toBe('health');
    expect(seen[0]?.topic).toBe('uptime');
    expect(seen[0]?.payload).toEqual({ seconds: 42 });
  });

  test('a payload that is not JSON is refused — no handle travels through the channel', () => {
    const bus = new InternalEventBus();
    const emit = makeGlobalDataEmit('health', { bus, logger });
    expect(() => emit.emit('uptime', (() => {}) as never)).toThrow(GlobalDataError);
    expect(() => emit.emit('uptime', new Date() as never)).toThrow(GlobalDataError);
    expect(() => emit.emit('uptime', { db: { knex: () => {} } } as never)).toThrow(GlobalDataError);
  });

  test('a topic must be one lowercase segment', () => {
    const bus = new InternalEventBus();
    const emit = makeGlobalDataEmit('health', { bus, logger });
    expect(() => emit.emit('Uptime', {})).toThrow(GlobalDataError);
    expect(() => emit.emit('a.b', {})).toThrow(GlobalDataError);
    expect(() => emit.emit('', {})).toThrow(GlobalDataError);
  });

  test('a topic is the unit of sharing: a subscriber gets its topic and never another', async () => {
    const bus = new InternalEventBus();
    const fromHealth = makeGlobalDataEmit('health', { bus, logger });
    const fromQueue = makeGlobalDataEmit('queue', { bus, logger });
    const uptimeSeen: GlobalDataDelivery[] = [];
    fromHealth.on('uptime', (delivery) => uptimeSeen.push(delivery));
    fromQueue.emit('uptime', { seconds: 1 });
    fromQueue.emit('backlog', { depth: 7 });
    fromHealth.emit('uptime', { seconds: 2 });
    await flush();
    // Both emitters are heard on the shared topic, and the source is always stamped.
    expect(uptimeSeen.map((delivery) => delivery.source)).toEqual(['queue', 'health']);
    expect(uptimeSeen.every((delivery) => delivery.topic === 'uptime')).toBe(true);
  });

  test('the channel refuses to pretend when the bus is absent', () => {
    const unavailable = makeUnavailableGlobalData('health');
    expect(() => unavailable.emit('uptime', {})).toThrow(GlobalDataError);
    expect(() => unavailable.on('uptime', () => {})).toThrow(GlobalDataError);
  });

  test('isJsonValue accepts data and refuses everything else', () => {
    expect(isJsonValue({ a: [1, 'two', null, true] })).toBe(true);
    expect(isJsonValue(() => {})).toBe(false);
    expect(isJsonValue(new Map())).toBe(false);
    expect(isJsonValue(undefined)).toBe(false);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(isJsonValue(cyclic)).toBe(false);
  });
});
