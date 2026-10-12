import { describe, expect, test, vi } from 'vitest';
import {
  readDiscoverModalSubmission,
  toCommandInteraction,
  toComponentInteraction,
  type RawInteractionLike,
} from '../../src/interactions/interaction-adapters.js';

function raw(over: Partial<RawInteractionLike> = {}): RawInteractionLike {
  return {
    commandName: 'modules',
    customId: 'dumby:info:u1:modules:hello-world',
    id: 'i-1',
    user: { id: 'u1' },
    guildId: 'g1',
    guild: { ownerId: 'u1' },
    reply: vi.fn(async () => undefined),
    deferReply: vi.fn(async () => undefined),
    editReply: vi.fn(async () => undefined),
    ...over,
  };
}

describe('toCommandInteraction (UR-20261012-043)', () => {
  test('carries the command name, user, guild and bound responders', async () => {
    const c = toCommandInteraction(raw());
    expect(c.commandName).toBe('modules');
    expect(c.user.id).toBe('u1');
    expect(c.guildId).toBe('g1');
    await c.reply({ content: 'x' });
    expect(typeof c.reply).toBe('function');
  });

  test('maps the channel to the router shape, including NSFW and category', () => {
    const c = toCommandInteraction(
      raw({ channel: { id: 'c1', parentId: 'cat1', isNSFW: () => true } }),
    );
    expect(c.channel).toEqual({ id: 'c1', categoryId: 'cat1', isNsfw: true });
  });

  test('omits the channel entirely when there is none', () => {
    expect(toCommandInteraction(raw()).channel).toBeUndefined();
  });

  test('collects only the admin permission bits the member actually holds', () => {
    const held = new Set(['ManageGuild', 'BanMembers']);
    const c = toCommandInteraction(raw({ member: { permissions: { has: (p) => held.has(p) } } }));
    expect(c.memberPermissions).toEqual(['ManageGuild', 'BanMembers']);
  });

  test('omits memberPermissions when the member exposes none', () => {
    expect(toCommandInteraction(raw()).memberPermissions).toBeUndefined();
  });

  test('reads the guild owner as OWNER — the UR-20261011-018 fix survives the move', () => {
    expect(toCommandInteraction(raw({ guild: { ownerId: 'u1' } })).isGuildOwner).toBe(true);
    expect(toCommandInteraction(raw({ guild: { ownerId: 'someone-else' } })).isGuildOwner).toBe(
      false,
    );
  });

  test('carries member roles when the cache is present', () => {
    const c = toCommandInteraction(
      raw({ member: { roles: { cache: { keys: () => ['r1', 'r2'][Symbol.iterator]() } } } }),
    );
    expect(c.memberRoles).toEqual(['r1', 'r2']);
  });

  test('a guild-less (DM) interaction has a null guildId', () => {
    expect(toCommandInteraction(raw({ guildId: null })).guildId).toBeNull();
  });
});

describe('toComponentInteraction (UR-20261012-043)', () => {
  test('carries the customId, user and guild', () => {
    const c = toComponentInteraction(raw());
    expect(c.customId).toBe('dumby:info:u1:modules:hello-world');
    expect(c.user.id).toBe('u1');
    expect(c.guildId).toBe('g1');
  });

  test('carries select-menu values only when present', () => {
    expect(toComponentInteraction(raw()).values).toBeUndefined();
    expect(toComponentInteraction(raw({ values: ['hello-world'] })).values).toEqual([
      'hello-world',
    ]);
  });

  test('carries deferUpdate and showModal only when the interaction offers them', () => {
    expect(toComponentInteraction(raw()).deferUpdate).toBeUndefined();
    expect(toComponentInteraction(raw()).showModal).toBeUndefined();
    const c = toComponentInteraction(
      raw({ deferUpdate: vi.fn(async () => undefined), showModal: vi.fn(async () => undefined) }),
    );
    expect(c.deferUpdate).toBeDefined();
    expect(c.showModal).toBeDefined();
  });
});

describe('readDiscoverModalSubmission (UR-20261012-043)', () => {
  const modal = (customId: string) =>
    raw({ customId, fields: { getTextInputValue: () => 'economy' } });

  test('reads the query from a Discover submission for the minting invoker', () => {
    expect(readDiscoverModalSubmission(modal('dumby:discover:submit:u1'), 'u1')).toEqual({
      query: 'economy',
    });
  });

  test('refuses a submission whose invoker is not the one the control was minted for', () => {
    expect(readDiscoverModalSubmission(modal('dumby:discover:submit:u1'), 'u2')).toBeUndefined();
  });

  test('refuses any other modal', () => {
    expect(readDiscoverModalSubmission(modal('dumby:persona:setup:u1'), 'u1')).toBeUndefined();
    expect(readDiscoverModalSubmission(modal(''), 'u1')).toBeUndefined();
  });

  test('refuses a submission with no readable fields', () => {
    expect(
      readDiscoverModalSubmission(raw({ customId: 'dumby:discover:submit:u1' }), 'u1'),
    ).toBeUndefined();
  });
});
