import { test, expect, describe, vi } from 'vitest';
import { EventRouter, type IEventHandler } from '../../src/events/event-router.js';

function makeRouter() {
  const logger = { info: vi.fn(), error: vi.fn() };
  const router = new EventRouter({ logger: logger as never, cache: {} as never });
  return { router, logger };
}

function handler(event: string, fn?: () => Promise<void>): IEventHandler {
  return { event: event as never, handle: fn ?? (async () => undefined) };
}

describe('EventRouter', () => {
  test('register stores handlers per event', () => {
    const { router } = makeRouter();
    router.register(handler('messageCreate'), 'health');
    router.register(handler('messageCreate'), 'hello');
    router.register(handler('messageDelete'), 'health');

    expect(router.getHandlers('messageCreate')).toHaveLength(2);
    expect(router.getHandlers('messageDelete')).toHaveLength(1);
    expect(router.getHandlers('unknown')).toEqual([]);
    expect(router.getRegisteredEvents().sort()).toEqual(['messageCreate', 'messageDelete']);
  });

  test('dispatch calls every handler for the event in order', async () => {
    const { router } = makeRouter();
    const calls: string[] = [];
    router.register(
      handler('messageCreate', async () => calls.push('a')),
      'health',
    );
    router.register(
      handler('messageCreate', async () => calls.push('b')),
      'hello',
    );

    await router.dispatch('messageCreate', { id: '1' });
    expect(calls).toEqual(['a', 'b']);
  });

  test('dispatch passes arguments through to handlers', async () => {
    const { router } = makeRouter();
    const fn = vi.fn(async (_arg: unknown) => undefined);
    router.register(handler('messageCreate', fn), 'health');
    await router.dispatch('messageCreate', { id: '1' });
    expect(fn).toHaveBeenCalledWith({ id: '1' });
  });

  test('dispatch isolates a throwing handler and continues to the next', async () => {
    const { router, logger } = makeRouter();
    const calls: string[] = [];
    router.register(
      handler('messageCreate', async () => calls.push('ok')),
      'health',
    );
    const broken: IEventHandler = {
      event: 'messageCreate' as never,
      handle: async () => {
        throw new Error('handler exploded');
      },
    };
    router.register(broken, 'hello');

    await router.dispatch('messageCreate');
    expect(calls).toEqual(['ok']);
    expect(logger.error).toHaveBeenCalledWith('event-handler-error', {
      event: 'messageCreate',
      error: 'Error: handler exploded',
    });
  });

  test('dispatch on an event with no handlers resolves silently', async () => {
    const { router } = makeRouter();
    await expect(router.dispatch('guildCreate')).resolves.toBeUndefined();
  });
});
