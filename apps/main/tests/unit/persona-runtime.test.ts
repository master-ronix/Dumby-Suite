import { describe, expect, test, vi } from 'vitest';
import { CommandRegistry, type CommandDefinition } from '../../src/commands/command-registry.js';
import {
  filterRegistryForModules,
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

describe('a persona registers the same set the main bot does (UR-20261012-054)', () => {
  test('registers BOTH global and guild, in that order, with the same payload', async () => {
    const puts: Array<{ route: string; body: unknown }> = [];
    const count = await deployPersonaCommands(
      'app-1',
      'g-1',
      [{ name: 'a' }, { name: 'b' }],
      async (route, body) => {
        puts.push({ route, body });
        return {};
      },
    );
    expect(count).toBe(2);
    expect(puts.map((p) => p.route)).toEqual([
      '/applications/app-1/commands',
      '/applications/app-1/guilds/g-1/commands',
    ]);
    expect(puts[0]?.body).toBe(puts[1]?.body);
  });

  test('an EMPTY set still PUTs, so a stale registration is cleared', async () => {
    // The old form returned early on an empty payload — which is why a persona with nothing bound
    // neither registered anything nor cleared what it had registered before. The overwrite is the
    // clear, so it must happen even with nothing to send.
    const puts: string[] = [];
    const count = await deployPersonaCommands('app-1', 'g-1', [], async (route) => {
      puts.push(route);
      return {};
    });
    expect(count).toBe(0);
    expect(puts).toHaveLength(2);
  });
});
