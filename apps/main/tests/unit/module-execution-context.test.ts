import { test, expect, describe, vi } from 'vitest';
import {
  currentModuleContext,
  installModuleContextStore,
  requireModuleContext,
  runWithModuleContext,
} from '@workspace/swastik';
import {
  createModuleContextStore,
  makeModuleContextResolver,
} from '../../src/module-system/execution-context.js';
import { ModuleLoader } from '../../src/module-system/loader.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import type { ModuleManifest } from '../../src/module-system/manifest.schema.js';

/**
 * UR-20261012-070 — a module can tell which profile is running its work and where, on the entry
 * points that are NOT a command. Commands got that in UR-20261012-067; an event handler, a job
 * processor and a cron task got nothing, because none of them receives an interaction to carry it.
 */

const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

function manifestOf(name: string, tier: string): ModuleManifest {
  return {
    name,
    tier,
    version: '1.0.0',
    description: 'test',
    required: false,
    commands: [],
    provides: [],
    depends: [],
    events: [],
    services: [],
    repositories: [],
    jobs: [],
    tasks: [],
    routes: [],
    middleware: [],
    migrations: [],
    locales: [],
    config: {},
    intents: [],
    partials: [],
  } as unknown as ModuleManifest;
}

describe('the SDK carrier (UR-20261012-070)', () => {
  test('with no store installed, the accessor is undefined and run() is a plain call', () => {
    // The SDK ships without a carrier; this is the "framework unchanged" path.
    expect(typeof runWithModuleContext).toBe('function');
    const seen = runWithModuleContext(
      {
        moduleId: 'x',
        source: 'job',
        identity: {
          profileId: 'main',
          kind: 'main',
          applicationId: 'a',
          profileName: 'D',
          guildId: null,
        },
        standing: {
          moduleId: 'x',
          tier: 'standard',
          enabled: true,
          owner: 'main',
          ownedByCaller: true,
        },
      },
      () => currentModuleContext(),
    );
    // Either the store is absent (undefined) or a previous test installed one — never a throw.
    expect(seen === undefined || seen.moduleId === 'x').toBe(true);
  });

  test('requireModuleContext names the reason rather than guessing', () => {
    // Run OUTSIDE any context.
    expect(() => requireModuleContext()).toThrow(/No module execution context is active/);
  });
});

describe('the resolver (UR-20261012-070)', () => {
  function resolverWith(over: Record<string, unknown> = {}) {
    const registry = new ModuleRegistry();
    registry.register({ manifest: manifestOf('hello-world', 'standard') } as never);
    registry.register({ manifest: manifestOf('dashboard', 'core') } as never);
    return makeModuleContextResolver({
      identity: async () => ({
        profileId: 'main',
        kind: 'main',
        applicationId: 'app-1',
        profileName: 'Dumby',
      }),
      registry,
      isModuleEnabledForGuild: async () => true,
      resolveOwner: async () => 'main',
      logger: logger() as never,
      ...over,
    } as never);
  }

  test('the identity carries the process profile plus the guild of THIS work', async () => {
    const ctx = await resolverWith()('hello-world', 'g-1', 'job');
    expect(ctx.identity.profileId).toBe('main');
    expect(ctx.identity.kind).toBe('main');
    expect(ctx.identity.applicationId).toBe('app-1');
    expect(ctx.identity.guildId).toBe('g-1');
    expect(ctx.source).toBe('job');
    expect(ctx.moduleId).toBe('hello-world');
  });

  test('a persona identity carries its id and bound guild', async () => {
    const ctx = await resolverWith({
      identity: async () => ({
        profileId: 'persona-1',
        kind: 'persona',
        applicationId: 'app-9',
        profileName: 'ELSA',
        boundGuildId: 'g-1',
      }),
    })('hello-world', 'g-1', 'event');
    expect(ctx.identity.kind).toBe('persona');
    expect(ctx.identity.boundGuildId).toBe('g-1');
    expect(ctx.standing.ownedByCaller).toBe(false); // owned by 'main' here
  });

  test('a Core module is shared and enabled without reading a dependency', async () => {
    const enabledRead = vi.fn(async () => false);
    const ownerRead = vi.fn(async () => 'someone');
    const ctx = await resolverWith({
      isModuleEnabledForGuild: enabledRead,
      resolveOwner: ownerRead,
    })('dashboard', 'g-1', 'event');
    expect(ctx.standing.tier).toBe('core');
    expect(ctx.standing.owner).toBe('shared');
    expect(ctx.standing.enabled).toBe(true);
    expect(ctx.standing.ownedByCaller).toBe(true);
    expect(enabledRead).not.toHaveBeenCalled();
    expect(ownerRead).not.toHaveBeenCalled();
  });

  test('a failing read yields the CONSERVATIVE standing — claim nothing, never a false yes', async () => {
    const ctx = await resolverWith({
      isModuleEnabledForGuild: async () => {
        throw new Error('database unavailable');
      },
      resolveOwner: async () => {
        throw new Error('database unavailable');
      },
    })('hello-world', 'g-1', 'task');
    expect(ctx.standing.enabled).toBe(false);
    expect(ctx.standing.owner).toBe('main');
  });

  test('a task (no guild) is not enabled and owns nothing', async () => {
    const ctx = await resolverWith()('hello-world', null, 'task');
    expect(ctx.identity.guildId).toBeNull();
    expect(ctx.standing.enabled).toBe(false);
  });
});

describe('a module SEES the context on every entry point (UR-20261012-070)', () => {
  installModuleContextStore(createModuleContextStore());

  function makeLoader(module: Record<string, unknown>) {
    const registry = new ModuleRegistry();
    registry.register({ manifest: manifestOf('hello-world', 'standard'), ...module } as never);

    const seen: Array<{ source: string; guildId: string | null }> = [];
    const queueStub = {
      registerQueue: (opts: { processor: (j: { data: unknown }) => Promise<unknown> }) => {
        processors.push(opts.processor);
      },
    };
    const processors: Array<(j: { data: unknown }) => Promise<unknown>> = [];
    const eventRouterStub = {
      register: (h: { handle: (...a: unknown[]) => Promise<unknown> }) => {
        handlers.push(h.handle);
      },
    };
    const handlers: Array<(...a: unknown[]) => Promise<unknown>> = [];
    const schedulerStub = {
      register: (t: { execute: () => Promise<unknown> }) => {
        tasks.push(t.execute);
      },
    };
    const tasks: Array<() => Promise<unknown>> = [];

    const container = {
      tryResolve: (token: string) => {
        if (String(token).includes('Queue')) return queueStub;
        if (String(token).includes('Event')) return eventRouterStub;
        if (String(token).includes('Scheduler')) return schedulerStub;
        return undefined;
      },
    };
    const loader = new ModuleLoader(registry, container as never, logger() as never);
    loader.setModuleContextResolver(async (moduleId, guildId, source) => {
      seen.push({ source, guildId });
      return {
        moduleId,
        source,
        identity: {
          profileId: 'main',
          kind: 'main',
          applicationId: 'app-1',
          profileName: 'Dumby',
          guildId,
        },
        standing: { moduleId, tier: 'standard', enabled: true, owner: 'main', ownedByCaller: true },
      };
    });
    return { loader, seen, processors, handlers, tasks };
  }

  test('an event handler sees which profile is answering and where', async () => {
    let observed: { source: string; guildId: string | null } | undefined;
    const { loader, handlers } = makeLoader({
      events: [
        {
          event: 'messageCreate',
          handle: () => {
            const c = currentModuleContext();
            observed =
              c === undefined ? undefined : { source: c.source, guildId: c.identity.guildId };
          },
        },
      ],
    });
    await loader.loadAll();
    await handlers[0]({ guildId: 'g-7' });

    expect(observed).toEqual({ source: 'event', guildId: 'g-7' });
  });

  test('a job processor sees the guild named in its payload', async () => {
    let observed: string | null | undefined;
    const { loader, processors } = makeLoader({
      jobs: [
        {
          queueName: 'q',
          process: () => {
            observed = currentModuleContext()?.identity.guildId;
          },
        },
      ],
    });
    await loader.loadAll();
    await processors[0]({ data: { guildId: 'g-3' } });

    expect(observed).toBe('g-3');
  });

  test('a cron task sees a context too — with no guild, because it has none', async () => {
    let observed: { source: string; guildId: string | null } | undefined;
    const { loader, tasks } = makeLoader({
      tasks: [
        {
          name: 'sweep',
          cron: '*/5',
          execute: () => {
            const c = currentModuleContext();
            observed =
              c === undefined ? undefined : { source: c.source, guildId: c.identity.guildId };
          },
        },
      ],
    });
    await loader.loadAll();
    await tasks[0]();

    expect(observed).toEqual({ source: 'task', guildId: null });
  });
});
