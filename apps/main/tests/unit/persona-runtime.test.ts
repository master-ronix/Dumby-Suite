import { describe, expect, test, vi } from 'vitest';
import { CommandRegistry, type CommandDefinition } from '../../src/commands/command-registry.js';
import {
  filterRegistryForModules,
  PersonaRuntime,
  type RuntimePersona,
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
  const deployCommands = vi.fn(async () => 3);
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const runtime = new PersonaRuntime({
    listPersonas: vi.fn(async () => personas),
    openBotToken: vi.fn(() => 'bot-token'),
    modulesBoundTo: vi.fn(async () => ['persona']),
    buildRegistry: vi.fn(() => registryWith(['persona', 'persona', 'core'])),
    createClient: vi.fn(() => ({ login, destroy })),
    deployCommands,
    logger: logger as never,
    ...over,
  } as never);
  return { runtime, login, destroy, deployCommands, logger };
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
