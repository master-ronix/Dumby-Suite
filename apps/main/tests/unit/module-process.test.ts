import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ProcessProvenanceError,
  ProcessRegistry,
  type ProcessDescriptor,
} from '../../src/module-system/process-registry.js';
import { makeProcessStanding } from '../../src/module-system/process-standing.js';
import { Scheduler } from '../../src/queue/scheduler.js';
import type { BaseTask } from '../../src/queue/base-processor.js';
import type { Logger } from '../../src/logging/logger.js';
import type { LockStore } from '../../src/cache/redis-lock-store.js';
import type { ModuleEnablement } from '../../src/module-system/enablement.js';
import type { ModuleRegistry } from '../../src/module-system/registry.js';

const logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as unknown as Logger;

function descriptor(over: Partial<ProcessDescriptor> = {}): ProcessDescriptor {
  return {
    moduleId: 'queue',
    name: 'queue:sweep',
    kind: 'task',
    profileId: 'main',
    profileKind: 'main',
    guildId: 'guild-1',
    trigger: 'cron',
    enabledBy: 'main',
    enabledAt: new Date('2026-10-27T00:00:00Z'),
    ...over,
  };
}

describe('ProcessRegistry — every live process carries the tuple a command carries', () => {
  test('a begun process records the full provenance tuple', () => {
    const registry = new ProcessRegistry({ logger });
    const handle = registry.begin(descriptor());
    const row = registry.get(handle.id);
    expect(row?.moduleId).toBe('queue');
    expect(row?.profileId).toBe('main');
    expect(row?.guildId).toBe('guild-1');
    expect(row?.trigger).toBe('cron');
    expect(row?.enabledBy).toBe('main');
    expect(row?.enabledAt).toBeInstanceOf(Date);
    expect(row?.state).toBe('running');
    expect(row?.provenanceComplete).toBe(true);
  });

  test('a descriptor missing a required field is refused, and says which', () => {
    const registry = new ProcessRegistry({ logger });
    const bad = { ...descriptor(), name: '' } as ProcessDescriptor;
    expect(() => registry.begin(bad)).toThrow(ProcessProvenanceError);
    try {
      registry.begin({ ...descriptor(), profileId: '' });
    } catch (err) {
      expect((err as ProcessProvenanceError).missing).toContain('profileId');
    }
  });

  test('an unknown enabler is recorded, not fatal — the row says so', () => {
    const registry = new ProcessRegistry({ logger });
    const handle = registry.begin(descriptor({ enabledBy: null, enabledAt: null }));
    const row = registry.get(handle.id);
    expect(row?.provenanceComplete).toBe(false);
    expect(row?.state).toBe('running');
  });

  test('terminateModule aborts the signal and marks the rows terminated', () => {
    const registry = new ProcessRegistry({ logger });
    const a = registry.begin(descriptor());
    const b = registry.begin(descriptor({ name: 'queue:other' }));
    const other = registry.begin(descriptor({ moduleId: 'health' }));
    expect(a.signal.aborted).toBe(false);
    const terminated = registry.terminateModule('queue');
    expect(terminated).toBe(2);
    expect(a.signal.aborted).toBe(true);
    expect(b.signal.aborted).toBe(true);
    expect(other.signal.aborted).toBe(false);
    expect(registry.get(a.id)?.state).toBe('terminated');
    expect(registry.get(a.id)?.endReason).toBe('module-disabled');
    expect(registry.live()).toHaveLength(1);
  });

  test('end is idempotent — the first state wins', () => {
    const registry = new ProcessRegistry({ logger });
    const handle = registry.begin(descriptor());
    handle.end('completed');
    handle.end('terminated');
    expect(registry.get(handle.id)?.state).toBe('completed');
  });
});

function enablement(over: Partial<ModuleEnablement> = {}): ModuleEnablement {
  return {
    isModuleEnabledForGuild: async () => true,
    isModuleEnabledAnywhere: async () => true,
    enabledByForGuild: async () => 'main',
    ...over,
  } as ModuleEnablement;
}

function registryWith(tier: 'core' | 'standard' | 'marketplace'): ModuleRegistry {
  return {
    get: (id: string) =>
      id === 'health'
        ? { manifest: { name: 'health', tier: 'core' } }
        : { manifest: { name: id, tier } },
  } as unknown as ModuleRegistry;
}

describe('ProcessStanding — one read, fail closed', () => {
  test('a core module is allowed without consulting the state row', async () => {
    const standing = makeProcessStanding({
      enablement: enablement({ isModuleEnabledForGuild: async () => false }),
      moduleRegistry: registryWith('core'),
      logger,
    });
    const result = await standing.forGuild({
      moduleId: 'health',
      guildId: 'g1',
      profileId: 'main',
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('core-tier');
  });

  test('a standard module disabled in the guild is refused', async () => {
    const standing = makeProcessStanding({
      enablement: enablement({ isModuleEnabledForGuild: async () => false }),
      moduleRegistry: registryWith('standard'),
      logger,
    });
    const result = await standing.forGuild({
      moduleId: 'hello-world',
      guildId: 'g1',
      profileId: 'main',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not-enabled');
  });

  test('an unreadable state row fails CLOSED and says why', async () => {
    const standing = makeProcessStanding({
      enablement: enablement({
        isModuleEnabledForGuild: async () => {
          throw new Error('db down');
        },
      }),
      moduleRegistry: registryWith('standard'),
      logger,
    });
    const result = await standing.forGuild({
      moduleId: 'hello-world',
      guildId: 'g1',
      profileId: 'main',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('state-unreadable');
  });

  test('the enabler and the moment travel with the standing', async () => {
    const standing = makeProcessStanding({
      enablement: enablement(),
      moduleRegistry: registryWith('standard'),
      logger,
      readProvenance: async () => ({ enabledBy: 'persona-7', updatedAt: '2026-10-27T05:00:00Z' }),
    });
    const result = await standing.forGuild({
      moduleId: 'hello-world',
      guildId: 'g1',
      profileId: 'main',
    });
    expect(result.enabledBy).toBe('persona-7');
    expect(result.enabledAt?.toISOString()).toBe('2026-10-27T05:00:00.000Z');
  });

  test('fleet-wide asks the any-guild question and also fails closed', async () => {
    const ok = makeProcessStanding({
      enablement: enablement(),
      moduleRegistry: registryWith('standard'),
      logger,
    });
    expect((await ok.forFleet('hello-world', 'main')).allowed).toBe(true);

    const broken = makeProcessStanding({
      enablement: enablement({
        isModuleEnabledAnywhere: async () => {
          throw new Error('db down');
        },
      }),
      moduleRegistry: registryWith('standard'),
      logger,
    });
    const result = await broken.forFleet('hello-world', 'main');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('state-unreadable');
  });
});

function fakeLockStore(): LockStore {
  return {
    setNX: async () => true,
    release: async () => {},
  } as unknown as LockStore;
}

function makeTask(name: string, run: (signal?: AbortSignal) => Promise<void>): BaseTask {
  return { name, cron: '*/1', execute: run };
}

describe('Scheduler — a disabled module’s process stops, and can be asked to stop early', () => {
  // The scheduler arms a real setTimeout for the cron's next occurrence, so the tests drive it with
  // fake timers: `*/1` is one MINUTE, not one tick.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const MINUTE = 60_000;

  test('a denied standing skips the run, and the task stays armed', async () => {
    const ran = vi.fn(async () => {});
    const denied = {
      moduleId: 'hello-world',
      guildId: 'g1',
      profileId: 'main',
      allowed: false,
      reason: 'not-enabled' as const,
      enabledBy: null,
      enabledAt: null,
    };
    const scheduler = new Scheduler({
      logger,
      lockStore: fakeLockStore(),
      standing: {
        forGuild: async () => denied,
        forFleet: async () => ({ ...denied, guildId: null }),
      },
    });
    scheduler.register(makeTask('t', ran), 'hello-world', { guildId: 'g1' });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(ran).not.toHaveBeenCalled();
    scheduler.stop();
  });

  test('terminateModule aborts the signal and stops the task re-arming', async () => {
    let seen: AbortSignal | undefined;
    const ran = vi.fn(async (signal?: AbortSignal) => {
      seen = signal;
    });
    const scheduler = new Scheduler({ logger, lockStore: fakeLockStore() });
    scheduler.register(makeTask('t', ran), 'hello-world', { guildId: 'g1' });
    scheduler.start();
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(ran).toHaveBeenCalledTimes(1);
    expect(seen?.aborted).toBe(false);

    const stopped = scheduler.terminateModule('hello-world');
    expect(stopped).toBe(1);
    expect(seen?.aborted).toBe(true);

    // A further period must not fire it again: termination clears the timer and blocks re-arming.
    await vi.advanceTimersByTimeAsync(MINUTE * 3);
    expect(ran).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  test('a terminated task can be resumed on re-enable', async () => {
    const ran = vi.fn(async () => {});
    const scheduler = new Scheduler({ logger, lockStore: fakeLockStore() });
    scheduler.register(makeTask('t', ran), 'hello-world', { guildId: 'g1' });
    scheduler.start();
    scheduler.terminateModule('hello-world');
    expect(scheduler.resumeModule('hello-world')).toBe(1);
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(ran).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  test('the run is recorded with its provenance while the module is enabled', async () => {
    const registry = new ProcessRegistry({ logger });
    const enabledAt = new Date('2026-10-27T01:00:00Z');
    const scheduler = new Scheduler({
      logger,
      lockStore: fakeLockStore(),
      registry,
      profileId: 'persona-3',
      profileKind: 'persona',
      standing: {
        forGuild: async () => ({
          moduleId: 'hello-world',
          guildId: 'g1',
          profileId: 'persona-3',
          allowed: true,
          reason: 'enabled' as const,
          enabledBy: 'persona-3',
          enabledAt,
        }),
        forFleet: async () => ({
          moduleId: 'hello-world',
          guildId: null,
          profileId: 'persona-3',
          allowed: true,
          reason: 'enabled' as const,
          enabledBy: null,
          enabledAt: null,
        }),
      },
    });
    scheduler.register(
      makeTask('t', async () => {}),
      'hello-world',
      { guildId: 'g1' },
    );
    scheduler.start();
    await vi.advanceTimersByTimeAsync(MINUTE);
    scheduler.stop();
    const rows = registry.snapshot();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.kind).toBe('task');
    expect(rows[0]?.profileId).toBe('persona-3');
    expect(rows[0]?.profileKind).toBe('persona');
    expect(rows[0]?.guildId).toBe('g1');
    expect(rows[0]?.enabledBy).toBe('persona-3');
    expect(rows[0]?.state).toBe('completed');
  });
});
