import { describe, expect, test, vi } from 'vitest';
import { buildComponentInteractionHandler } from '../../src/personas/persona-interaction-handler.js';
import type { InteractionRegistry } from '../../src/interactions/interaction-registry.js';

function deps(dispatch: (i: unknown) => Promise<boolean>) {
  const warn = vi.fn();
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
