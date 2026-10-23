import { describe, expect, test, vi } from 'vitest';
import { CommandRegistry, type CommandDefinition } from '../../src/commands/command-registry.js';
import {
  filterRegistryForModules,
  personaRegistryModules,
  PersonaRuntime,
  type RuntimePersona,
  deployPersonaCommands,
} from '../../src/personas/persona-runtime.js';

const def = (name: string, moduleId: string): CommandDefinition =>
  ({
    data: { name, description: name },
    execute: vi.fn(),
    moduleId,
  }) as unknown as CommandDefinition;

function registryWith(...entries: Array<[string, string, 'core' | 'standard' | 'marketplace']>) {
  const registry = new CommandRegistry();
  for (const [name, moduleId, tier] of entries) {
    if (registry.getModuleTier(moduleId) === undefined) registry.registerModule(moduleId, tier);
    registry.register(def(name, moduleId));
  }
  return registry;
}

describe('filterRegistryForModules', () => {
  test('keeps only the listed modules, preserving their tier', () => {
    const source = registryWith(
      ['persona', 'persona', 'core'],
      ['health', 'health', 'core'],
      ['hello', 'hello-world', 'standard'],
    );
    const filtered = filterRegistryForModules(source, new Set(['persona', 'hello-world']));
    expect(
      filtered
        .all()
        .map((c) => c.data.name)
        .sort(),
    ).toEqual(['hello', 'persona']);
    expect(filtered.getModuleTier('hello-world')).toBe('standard');
    expect(filtered.get('health')).toBeUndefined();
  });

  test('an empty module set yields an empty registry', () => {
    const source = registryWith(['persona', 'persona', 'core']);
    expect(filterRegistryForModules(source, new Set()).count()).toBe(0);
  });

  test('the source registry is left untouched', () => {
    const source = registryWith(
      ['persona', 'persona', 'core'],
      ['hello', 'hello-world', 'standard'],
    );
    filterRegistryForModules(source, new Set(['persona']));
    expect(source.count()).toBe(2);
  });
});

const persona = (over: Partial<RuntimePersona> = {}): RuntimePersona =>
  ({
    id: 'persona-1',
    name: 'Nova',
    discordApplicationId: 'app-9',
    boundGuildId: 'g1',
    botTokenSealed: { ciphertext: 'x' } as never,
    status: 'active',
    ...over,
  }) as RuntimePersona;

function makeRuntime(personas: RuntimePersona[], over: Record<string, unknown> = {}) {
  const login = vi.fn(async () => 'ok');
  const destroy = vi.fn(async () => undefined);
  const on = vi.fn();
  const deployCommands = vi.fn(async () => 3);
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const runtime = new PersonaRuntime({
    listPersonas: vi.fn(async () => personas),
    openBotToken: vi.fn(() => 'bot-token'),
    modulesBoundTo: vi.fn(async () => ['persona']),
    buildRegistry: vi.fn(() => registryWith(['persona', 'persona', 'core'])),
    createClient: vi.fn(() => ({ login, destroy, on })),
    deployCommands,
    logger: logger as never,
    ...over,
  } as never);
  return { runtime, login, destroy, deployCommands, logger, on };
}

describe('PersonaRuntime.start', () => {
  test('hosts an active persona: deploys its commands then logs it in', async () => {
    const { runtime, login, deployCommands } = makeRuntime([persona()]);
    const results = await runtime.start();
    expect(results).toEqual([{ personaId: 'persona-1', name: 'Nova', started: true, commands: 3 }]);
    expect(deployCommands).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith('bot-token');
    expect(runtime.hostedCount()).toBe(1);
  });

  test('skips a non-active persona without touching its token', async () => {
    const openBotToken = vi.fn(() => 'bot-token');
    const { runtime, login } = makeRuntime([persona({ status: 'retired' })], { openBotToken });
    const results = await runtime.start();
    expect(results[0]?.started).toBe(false);
    expect(results[0]?.reason).toBe('not-active');
    expect(openBotToken).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
  });

  test('one persona failing does not stop the rest', async () => {
    const openBotToken = vi.fn((sealed: { ciphertext: string }) => {
      if (sealed.ciphertext === 'bad') throw new Error('unwrappable');
      return 'bot-token';
    });
    const { runtime, login } = makeRuntime(
      [
        persona({ id: 'p-bad', botTokenSealed: { ciphertext: 'bad' } as never }),
        persona({ id: 'p-good' }),
      ],
      { openBotToken },
    );
    const results = await runtime.start();
    expect(results[0]?.started).toBe(false);
    expect(results[0]?.reason).toBe('unwrappable');
    expect(results[1]?.started).toBe(true);
    expect(login).toHaveBeenCalledTimes(1);
    expect(runtime.hostedCount()).toBe(1);
  });

  test('an empty bot token is reported, not logged in', async () => {
    const { runtime, login } = makeRuntime([persona()], { openBotToken: () => '' });
    const results = await runtime.start();
    expect(results[0]?.reason).toBe('empty-bot-token');
    expect(login).not.toHaveBeenCalled();
  });

  test('the outcome is in the log message, not only the fields', async () => {
    const { runtime, logger } = makeRuntime([persona()]);
    await runtime.start();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('persona-runtime-started'));
  });
});

describe('PersonaRuntime.start — boot safety', () => {
  test('a listing failure yields an empty run instead of propagating', async () => {
    const { runtime, logger } = makeRuntime([], {
      listPersonas: vi.fn(async () => {
        throw new Error('db down');
      }),
    });
    await expect(runtime.start()).resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('persona-runtime-list-failed'),
    );
  });
});

describe('PersonaRuntime.stop', () => {
  test('logs every hosted persona out and clears the count', async () => {
    const { runtime, destroy } = makeRuntime([persona()]);
    await runtime.start();
    await runtime.stop();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(runtime.hostedCount()).toBe(0);
  });

  test('a failing destroy is logged and does not throw', async () => {
    const { runtime, logger } = makeRuntime([persona()]);
    await runtime.start();
    await runtime.stop();
    // stopping twice is idempotent
    await expect(runtime.stop()).resolves.toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('the persona dispatches its own controls (UR-20261012-043 / A2.1)', () => {
  test('subscribes to interactionCreate BEFORE login, so no early interaction is missed', async () => {
    const handler = vi.fn();
    const order: string[] = [];
    const on = vi.fn(() => order.push('on'));
    const login = vi.fn(async () => {
      order.push('login');
      return 'ok';
    });
    const { runtime } = makeRuntime([persona()], {
      createClient: () => ({ login, destroy: vi.fn(), on }),
      createInteractionHandler: vi.fn(() => handler),
    });
    await runtime.start();
    expect(on).toHaveBeenCalledWith('interactionCreate', handler);
    expect(order).toEqual(['on', 'login']);
  });

  test('builds the handler for THIS persona and its filtered registry', async () => {
    const createInteractionHandler = vi.fn(() => vi.fn());
    const { runtime } = makeRuntime([persona()], { createInteractionHandler });
    await runtime.start();
    expect(createInteractionHandler).toHaveBeenCalledTimes(1);
    expect(createInteractionHandler.mock.calls[0]?.[0]).toMatchObject({ id: 'persona-1' });
  });

  test('without a handler the persona still starts — controls are additive, not required', async () => {
    const { runtime, on } = makeRuntime([persona()]);
    const results = await runtime.start();
    expect(results[0]?.started).toBe(true);
    expect(on).not.toHaveBeenCalled();
  });
});

describe('why a persona has no commands is reported (UR-20261012-050)', () => {
  test('nothing bound is called out, because the persona owns nothing', async () => {
    const { runtime, logger } = makeRuntime([persona()], { modulesBoundTo: vi.fn(async () => []) });
    await runtime.start();
    const warned = logger.warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(warned).toContain('persona-no-modules-bound');
    // UR-20261012-054 — a persona now REGISTERS the full command set; what it lacks is ownership, so
    // it refuses everything it is not bound to. The warning says that, not "no commands".
    expect(warned).toContain('OWNS nothing');
  });

  test('a bound slug that contributes no commands is named', async () => {
    // A binding whose slug is not a module id contributes nothing — silently, before this.
    const { runtime, logger } = makeRuntime([persona()], {
      modulesBoundTo: vi.fn(async () => ['ghost-module']),
      buildRegistry: vi.fn(() => registryWith(['persona'])),
    });
    await runtime.start();
    const warned = logger.warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(warned).toContain('persona-bound-module-unregistered');
    expect(warned).toContain('ghost-module');
  });

  test('a fully-matched binding set warns about neither', async () => {
    const { runtime, logger } = makeRuntime([persona()], {
      modulesBoundTo: vi.fn(async () => ['persona']),
      buildRegistry: vi.fn(() => registryWith(['persona', 'persona'])),
    });
    await runtime.start();
    const warned = logger.warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(warned).not.toContain('persona-no-modules-bound');
    expect(warned).not.toContain('persona-bound-module-unregistered');
  });

  test('the started line carries the binding count as well as the command count', async () => {
    const { runtime, logger } = makeRuntime([persona()], {
      modulesBoundTo: vi.fn(async () => ['persona']),
      buildRegistry: vi.fn(() => registryWith(['persona', 'persona'])),
    });
    await runtime.start();
    const started = logger.info.mock.calls
      .map((c) => String(c[0]))
      .find((m) => m.startsWith('persona-runtime-started'));
    expect(started).toContain('bound=1');
    // `makeRuntime`'s deployCommands resolves 3, so the line reports the DEPLOYED count.
    expect(started).toContain('commands=3');
  });
});

describe('a persona registers the same SPLIT the main bot does (UR-20261012-058)', () => {
  test('CLEARS both scopes, then registers CORE globally and the rest to the bound guild', async () => {
    // The main bot's rule (command-deployer.ts): core global, standard/marketplace per guild. Each
    // command lands in EXACTLY ONE scope — so nothing duplicates, and a core command works in a DM.
    const puts: Array<{ route: string; body: readonly unknown[] }> = [];
    const count = await deployPersonaCommands(
      'app-1',
      'g-1',
      { global: [{ name: 'health' }], guild: [{ name: 'hello' }] },
      async (route, body) => {
        puts.push({ route, body });
        return {};
      },
    );
    expect(count).toBe(2);
    expect(puts.map((p) => p.route)).toEqual([
      '/applications/app-1/commands', // clear stale global
      '/applications/app-1/guilds/g-1/commands', // clear stale guild
      '/applications/app-1/commands', // core, GLOBAL
      '/applications/app-1/guilds/g-1/commands', // standard/marketplace, bound guild
    ]);
    expect(puts[2]?.body).toEqual([{ name: 'health' }]);
    expect(puts[3]?.body).toEqual([{ name: 'hello' }]);
    // No command is registered in both scopes.
    const registered = puts.filter((p) => Array.isArray(p.body) && p.body.length > 0);
    expect(registered).toHaveLength(2);
  });

  test('an EMPTY set still CLEARS both scopes', async () => {
    const puts: string[] = [];
    const count = await deployPersonaCommands(
      'app-1',
      'g-1',
      { global: [], guild: [] },
      async (route) => {
        puts.push(route);
        return {};
      },
    );
    expect(count).toBe(0);
    expect(puts).toEqual([
      '/applications/app-1/commands',
      '/applications/app-1/guilds/g-1/commands',
    ]);
  });
});

describe('PersonaRuntime.applyPresence (UR-20261012-082)', () => {
  test('applies the configured presence at login, and re-applies it live', async () => {
    const setPresence = vi.fn();
    const { runtime } = makeRuntime([persona({ presenceStatus: 'idle', note: 'brb' })], {
      createClient: () => ({ login: vi.fn(), destroy: vi.fn(), on: vi.fn(), setPresence }),
    } as never);

    await runtime.start();
    // Applied once at login, from the stored value.
    expect(setPresence).toHaveBeenCalledWith({ status: 'idle', note: 'brb' });

    // A Twill update reaches the RUNNING client — not only the next restart.
    expect(runtime.applyPresence('persona-1', { status: 'dnd', note: 'busy' })).toBe(true);
    expect(setPresence).toHaveBeenLastCalledWith({ status: 'dnd', note: 'busy' });
  });

  test('returns false when the persona is not hosted, rather than claiming success', () => {
    const { runtime } = makeRuntime([]);
    expect(runtime.applyPresence('nope', { status: 'idle' })).toBe(false);
  });

  test('a client without a presence port is reported as not applied', async () => {
    const { runtime } = makeRuntime([persona()], {
      createClient: () => ({ login: vi.fn(), destroy: vi.fn(), on: vi.fn() }),
    } as never);
    await runtime.start();
    expect(runtime.applyPresence('persona-1', { status: 'idle' })).toBe(false);
  });
});

describe('PersonaRuntime.stopPersona (UR-20261012-083)', () => {
  test('destroys the client and clears her commands — a revoke takes effect now', async () => {
    const destroy = vi.fn();
    const clearCommands = vi.fn(async () => 0);
    const { runtime } = makeRuntime([persona()], {
      createClient: () => ({ login: vi.fn(), destroy, on: vi.fn() }),
      clearCommands,
    } as never);
    await runtime.start();
    expect(runtime.hostedCount()).toBe(1);

    const stopped = await runtime.stopPersona(persona());

    expect(stopped).toBe(true);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(runtime.hostedCount()).toBe(0);
    // Her commands are registered against her APPLICATION, so they outlive the client.
    expect(clearCommands).toHaveBeenCalledTimes(1);
  });

  test('a persona that is not hosted reports false, but her commands are STILL cleared', async () => {
    const clearCommands = vi.fn(async () => 0);
    const { runtime } = makeRuntime([], { clearCommands } as never);

    const stopped = await runtime.stopPersona(persona());

    expect(stopped).toBe(false);
    expect(clearCommands).toHaveBeenCalledTimes(1);
  });

  test('a failing destroy does not stop the commands from being cleared', async () => {
    const clearCommands = vi.fn(async () => 0);
    const { runtime } = makeRuntime([persona()], {
      createClient: () => ({
        login: vi.fn(),
        destroy: vi.fn(() => {
          throw new Error('gateway already gone');
        }),
        on: vi.fn(),
      }),
      clearCommands,
    } as never);
    await runtime.start();

    await runtime.stopPersona(persona());

    expect(clearCommands).toHaveBeenCalledTimes(1);
    expect(runtime.hostedCount()).toBe(0);
  });
});

describe('PersonaRuntime reload + start filter (UR-20261012-085)', () => {
  test('start(only) hosts just the matching persona', async () => {
    const login = vi.fn();
    const { runtime } = makeRuntime([persona({ id: 'p-1' }), persona({ id: 'p-2' })], {
      createClient: () => ({ login, destroy: vi.fn(), on: vi.fn() }),
    } as never);

    const results = await runtime.start((p) => p.id === 'p-2');

    expect(results.map((r) => r.personaId)).toEqual(['p-2']);
    expect(runtime.hostedCount()).toBe(1);
  });

  test('reloadPersona stops her and starts her again from the CURRENT row', async () => {
    const login = vi.fn();
    const destroy = vi.fn();
    const clearCommands = vi.fn(async () => 0);
    const { runtime } = makeRuntime([persona({ id: 'p-1' })], {
      createClient: () => ({ login, destroy, on: vi.fn() }),
      clearCommands,
    } as never);
    await runtime.start();
    expect(runtime.hostedCount()).toBe(1);

    const result = await runtime.reloadPersona(persona({ id: 'p-1' }));

    expect(result?.started).toBe(true);
    expect(destroy).toHaveBeenCalledTimes(1); // the old client was closed
    expect(login).toHaveBeenCalledTimes(2); // once at boot, once on the reload
    expect(runtime.hostedCount()).toBe(1);
  });

  test('reloadPersona on a row that is gone returns undefined rather than a fabricated result', async () => {
    const { runtime } = makeRuntime([persona({ id: 'p-1' })], {
      createClient: () => ({ login: vi.fn(), destroy: vi.fn(), on: vi.fn() }),
    } as never);
    await runtime.start();

    const result = await runtime.reloadPersona(persona({ id: 'gone' }));

    expect(result).toBeUndefined();
  });

  test('a retired persona reloads as not-active, and is not hosted', async () => {
    const { runtime } = makeRuntime([persona({ id: 'p-1', status: 'retired' })], {
      createClient: () => ({ login: vi.fn(), destroy: vi.fn(), on: vi.fn() }),
    } as never);

    const result = await runtime.reloadPersona(persona({ id: 'p-1', status: 'retired' }));

    expect(result?.started).toBe(false);
    expect(result?.reason).toBe('not-active');
    expect(runtime.hostedCount()).toBe(0);
  });
});

describe('personaRegistryModules — core plus owned, and nothing else', () => {
  const core = ['dashboard', 'modules', 'persona'];

  test('a persona with NOTHING bound still carries the core modules', () => {
    // The regression: bindings alone left it registering nothing at all, not even /dashboard.
    expect(personaRegistryModules(core, [])).toStrictEqual(core);
  });

  test('a held module joins core, and a module claimed elsewhere never appears', () => {
    const held = personaRegistryModules(core, ['hello-world']);
    expect(held).toContain('hello-world');
    expect(held).toContain('dashboard');
    // A module owned by another profile is simply absent — not registered-then-refused.
    expect(held).not.toContain('browse');
  });

  test('a slug already in core is not duplicated', () => {
    const held = personaRegistryModules(core, ['modules']);
    expect(held.filter((s) => s === 'modules')).toHaveLength(1);
  });

  test('the filter then keeps exactly those, core included', () => {
    const source = registryWith(
      ['dashboard', 'dashboard', 'core'],
      ['hello', 'hello-world', 'standard'],
      ['browse', 'browse', 'core'],
    );
    const kept = filterRegistryForModules(
      source,
      new Set(personaRegistryModules(['dashboard'], ['hello-world'])),
    );
    expect(kept.all().map((d) => d.data.name)).toStrictEqual(['dashboard', 'hello']);
  });
});

describe('the runtime answers for the profile /health must report (Q1-Q4)', () => {
  test('an application resolves to its own client, its own modules and its start time', async () => {
    const { runtime } = makeRuntime([persona()]);
    await runtime.start();
    const found = runtime.runtimeFor('app-9');
    expect(found).toBeDefined();
    // Her MODULE slugs, not a command registry: only the module registry carries tiers.
    expect(found?.moduleSlugs).toStrictEqual(['persona']);
    expect(typeof found?.startedAt).toBe('number');
    expect(found?.client).toBeDefined();
  });

  test('an application it does not host resolves to NOTHING, never to the host by accident', async () => {
    // The empty application id is the host's own scope. Returning something for it would make a
    // persona's page report the host while claiming to be per-profile.
    const { runtime } = makeRuntime([persona()]);
    await runtime.start();
    expect(runtime.runtimeFor('app-other')).toBeUndefined();
    expect(runtime.runtimeFor('')).toBeUndefined();
  });

  test('a stopped persona stops being resolvable', async () => {
    const { runtime } = makeRuntime([persona()]);
    await runtime.start();
    await runtime.stopPersona(persona() as never);
    expect(runtime.runtimeFor('app-9')).toBeUndefined();
  });
});
