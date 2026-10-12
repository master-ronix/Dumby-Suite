import { describe, expect, test, vi } from 'vitest';
import {
  createPersonaPresence,
  personaPresenceFromClient,
} from '../../src/personas/persona-presence.js';

describe('createPersonaPresence', () => {
  test('reports present when the persona bot is a guild member', async () => {
    const presence = createPersonaPresence({
      getGuild: () => ({ members: { fetch: vi.fn(async () => ({ id: 'app-1' })) } }),
    });
    expect(await presence('g1', 'app-1')).toBe(true);
  });

  test('reports absent when the guild is not cached', async () => {
    const fetch = vi.fn(async () => ({ id: 'app-1' }));
    const presence = createPersonaPresence({ getGuild: () => undefined });
    expect(await presence('g1', 'app-1')).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('reports absent for an empty application id', async () => {
    const fetch = vi.fn(async () => ({ id: 'x' }));
    const presence = createPersonaPresence({ getGuild: () => ({ members: { fetch } }) });
    expect(await presence('g1', '')).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('reports absent and calls onError when the fetch fails', async () => {
    const onError = vi.fn();
    const presence = createPersonaPresence({
      getGuild: () => ({
        members: {
          fetch: async () => {
            throw new Error('Unknown Member');
          },
        },
      }),
      onError,
    });
    expect(await presence('g1', 'app-1')).toBe(false);
    expect(onError).toHaveBeenCalledWith('g1', 'app-1', expect.any(Error));
  });

  test('reports absent when the member resolves to nothing', async () => {
    const presence = createPersonaPresence({
      getGuild: () => ({ members: { fetch: async () => undefined } }),
    });
    expect(await presence('g1', 'app-1')).toBe(false);
  });
});

describe('personaPresenceFromClient', () => {
  test('reads the guild from the client and warns through the logger on failure', async () => {
    const warn = vi.fn();
    const client = {
      guilds: {
        cache: {
          get: (): { members: { fetch: (id: string) => Promise<unknown> } } => ({
            members: {
              fetch: async () => {
                throw new Error('nope');
              },
            },
          }),
        },
      },
    };
    const presence = personaPresenceFromClient(() => client, warn);
    expect(await presence('g1', 'app-1')).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('persona-presence-check-failed'));
  });

  test('reports absent when no client is available', async () => {
    const presence = personaPresenceFromClient(() => undefined, vi.fn());
    expect(await presence('g1', 'app-1')).toBe(false);
  });

  test('FETCHES an uncached guild rather than reading its members as absent', async () => {
    const fetch = vi.fn(async () => ({ members: { fetch: async () => ({ id: 'app-1' }) } }));
    const client = { guilds: { cache: { get: () => undefined }, fetch } };
    const presence = personaPresenceFromClient(() => client as never, vi.fn());
    expect(await presence('g1', 'app-1')).toBe(true);
    expect(fetch).toHaveBeenCalledWith('g1');
  });

  test('reports absent when the guild fetch itself fails', async () => {
    const client = {
      guilds: {
        cache: { get: () => undefined },
        fetch: async () => {
          throw new Error('Unknown Guild');
        },
      },
    };
    const presence = personaPresenceFromClient(() => client as never, vi.fn());
    expect(await presence('g1', 'app-1')).toBe(false);
  });

  test('a cached guild is used without a fetch', async () => {
    const fetch = vi.fn();
    const client = {
      guilds: {
        cache: { get: () => ({ members: { fetch: async () => ({ id: 'app-1' }) } }) },
        fetch,
      },
    };
    const presence = personaPresenceFromClient(() => client as never, vi.fn());
    expect(await presence('g1', 'app-1')).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
