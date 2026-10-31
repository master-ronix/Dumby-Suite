import { describe, expect, test, vi } from 'vitest';
import {
  buildComponentInteractionHandler,
  buildPersonaInteractionHandler,
} from '../../../../apps/main/src/personas/persona-interaction-handler.js';
import type { InteractionRegistry } from '../../../../apps/main/src/interactions/interaction-registry.js';

function deps(dispatchImpl: (i: unknown) => Promise<boolean>) {
  const warn = vi.fn();
  // UR-20261012-043 — the registry's dispatch must be a SPY for the assertions; passing the raw
  // function made every `.mock` access throw ("is not a spy").
  const dispatch = vi.fn(dispatchImpl);
  const registry = { dispatch } as unknown as InteractionRegistry;
  return { deps: { registry, logger: { warn, info: vi.fn() } as never }, warn, dispatch };
}

const button = (over: Record<string, unknown> = {}) => ({
  customId: 'dumby:info:u1:modules:hello-world',
  user: { id: 'u1' },
  guildId: 'g1',
  isButton: () => true,
  reply: vi.fn(),
  deferReply: vi.fn(),
  editReply: vi.fn(),
  ...over,
});

describe('buildComponentInteractionHandler (UR-20261012-043 / A2.1)', () => {
  test('dispatches a button press through the registry', async () => {
    const { deps: d, dispatch } = deps(async () => true);
    await buildComponentInteractionHandler(d)(button());
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  test('adapts the interaction to the registry shape before dispatching', async () => {
    const { deps: d, dispatch } = deps(async () => true);
    await buildComponentInteractionHandler(d)(button());
    const passed = dispatch.mock.calls[0]?.[0] as { customId: string; user: { id: string } };
    expect(passed.customId).toBe('dumby:info:u1:modules:hello-world');
    expect(passed.user.id).toBe('u1');
  });

  test('dispatches a string select menu too', async () => {
    const { deps: d, dispatch } = deps(async () => true);
    await buildComponentInteractionHandler(d)(
      button({ isButton: undefined, isStringSelectMenu: () => true, values: ['hello-world'] }),
    );
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  test('ignores a non-control interaction entirely', async () => {
    const { deps: d, dispatch } = deps(async () => true);
    await buildComponentInteractionHandler(d)({ customId: '', user: { id: 'u1' } });
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('logs an unhandled control instead of failing silently', async () => {
    const { deps: d, warn } = deps(async () => false);
    await buildComponentInteractionHandler(d)(button());
    expect(String(warn.mock.calls[0]?.[0])).toContain('unhandled-component-interaction');
    expect(String(warn.mock.calls[0]?.[0])).toContain('hello-world');
  });

  test('a throwing registry is logged, never propagated — one bad button must not kill the listener', async () => {
    const { deps: d, warn } = deps(async () => {
      throw new Error('boom');
    });
    await expect(buildComponentInteractionHandler(d)(button())).resolves.toBeUndefined();
    expect(String(warn.mock.calls[0]?.[0])).toContain('component-interaction-failed');
    expect(String(warn.mock.calls[0]?.[0])).toContain('boom');
  });
});

const command = (over: Record<string, unknown> = {}) => ({
  commandName: 'hello',
  user: { id: 'u1' },
  guildId: 'g1',
  isChatInputCommand: () => true,
  reply: vi.fn(),
  deferReply: vi.fn(),
  editReply: vi.fn(),
  ...over,
});

function personaDeps(over: Record<string, unknown> = {}) {
  const warn = vi.fn();
  const dispatch = vi.fn(async () => undefined);
  return {
    dispatch,
    warn,
    deps: {
      registry: { dispatch: vi.fn(async () => true) } as unknown as InteractionRegistry,
      logger: { warn, info: vi.fn() } as never,
      createCommandRouter: () => ({ dispatch }),
      ...over,
    } as never,
  };
}

describe('buildPersonaInteractionHandler (UR-20261012-049)', () => {
  test('a slash command is dispatched through the persona router', async () => {
    // Before this, a persona's commands were registered in the guild and dispatched by NOTHING:
    // buildDiscordClient attaches only error/warn, and only the component path was wired. Discord
    // showed "The application did not respond" after three seconds.
    const { deps, dispatch } = personaDeps();
    await buildPersonaInteractionHandler(deps)(command());
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  test('it adapts the interaction before dispatching', async () => {
    const { deps, dispatch } = personaDeps();
    await buildPersonaInteractionHandler(deps)(command());
    expect(dispatch.mock.calls[0]?.[0]).toMatchObject({
      commandName: 'hello',
      user: { id: 'u1' },
      guildId: 'g1',
    });
  });

  test('the router is built ONCE, not per interaction', async () => {
    const createCommandRouter = vi.fn(() => ({ dispatch: vi.fn(async () => undefined) }));
    const handler = buildPersonaInteractionHandler({
      registry: { dispatch: vi.fn(async () => true) } as unknown as InteractionRegistry,
      logger: { warn: vi.fn(), info: vi.fn() } as never,
      createCommandRouter,
    });
    await handler(command());
    await handler(command());
    await handler(command());
    expect(createCommandRouter).toHaveBeenCalledTimes(1);
  });

  test('a router that cannot be built degrades to components-only, and does not throw', async () => {
    const { deps, warn } = personaDeps({
      createCommandRouter: () => {
        throw new Error('no router for you');
      },
    });
    await expect(buildPersonaInteractionHandler(deps)(command())).resolves.toBeUndefined();
    expect(String(warn.mock.calls[0]?.[0])).toContain('persona-command-router-failed');
    expect(String(warn.mock.calls[0]?.[0])).toContain('no router for you');
  });

  test('with no router at all, a command is reported rather than silently dropped', async () => {
    const { deps, warn } = personaDeps({ createCommandRouter: undefined });
    await buildPersonaInteractionHandler(deps)(command());
    expect(String(warn.mock.calls[0]?.[0])).toContain('persona-command-unhandled');
    expect(String(warn.mock.calls[0]?.[0])).toContain('hello');
  });

  test('a dispatch failure is logged, never propagated', async () => {
    const { deps, warn } = personaDeps({
      createCommandRouter: () => ({
        dispatch: vi.fn(async () => {
          throw new Error('boom');
        }),
      }),
    });
    await expect(buildPersonaInteractionHandler(deps)(command())).resolves.toBeUndefined();
    expect(String(warn.mock.calls[0]?.[0])).toContain('persona-command-dispatch-failed');
    expect(String(warn.mock.calls[0]?.[0])).toContain('boom');
  });

  test('buttons and selects still reach the component registry', async () => {
    const registryDispatch = vi.fn(async () => true);
    const handler = buildPersonaInteractionHandler({
      registry: { dispatch: registryDispatch } as unknown as InteractionRegistry,
      logger: { warn: vi.fn(), info: vi.fn() } as never,
      createCommandRouter: () => ({ dispatch: vi.fn(async () => undefined) }),
    });
    await handler(button());
    expect(registryDispatch).toHaveBeenCalledTimes(1);
  });

  test('a non-control, non-command interaction is ignored', async () => {
    const registryDispatch = vi.fn(async () => true);
    const handler = buildPersonaInteractionHandler({
      registry: { dispatch: registryDispatch } as unknown as InteractionRegistry,
      logger: { warn: vi.fn(), info: vi.fn() } as never,
    });
    await handler({ customId: '', user: { id: 'u1' } });
    expect(registryDispatch).not.toHaveBeenCalled();
  });
});
