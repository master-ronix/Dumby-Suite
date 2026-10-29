import { describe, expect, test } from 'vitest';
import { personaBlocks } from '@module-persona-blocks';
import { registerModuleEmoji, resetModuleEmojis } from '../../src/rendering/module-icons.js';

type Any = Record<string, unknown>;

// UR-20261029-116 — the builder no longer reaches into the framework: the page hands it the
// resolvers. These resolve nothing, so every mark falls back to its unicode glyph.
const emoji = (): string | undefined => undefined;
const emojiParts = (): { id: string; name: string } | undefined => undefined;

const data = {
  status: 'online',
  currentProfileId: 'main',
  selectedProfileId: 'main',
  profiles: [
    {
      id: 'main',
      name: 'Dumby',
      isMain: true,
      applicationId: '1422973358818988155',
      shards: '1',
      dmBehavior: 'Prohibited',
      statusKind: 'online',
      statusLabel: 'Online',
      present: true,
      hasOAuth: true,
      inviteUrl: 'https://dumby.example/auth/authorize?app=142&guild=g1&bot=1',
      moduleCount: 2,
      commandCount: 3,
    },
    {
      id: 'p-2',
      name: 'Aurora',
      isMain: false,
      applicationId: '999000111222333444',
      shards: '1',
      dmBehavior: 'Allowed',
      statusKind: 'online',
      statusLabel: 'Online',
      present: false,
      hasOAuth: false,
      inviteUrl: 'https://discord.com/oauth2/authorize?client_id=999&guild_id=g1',
      moduleCount: 1,
      commandCount: 1,
    },
  ],
  tiers: [
    {
      tier: 'core',
      modules: [
        { name: 'persona', icon: '<:dumby_persona:1>', commands: ['persona'] },
        { name: 'health', icon: '', commands: ['health'] },
      ],
    },
    { tier: 'standard', modules: [{ name: 'hello-world', icon: '', commands: ['hello'] }] },
  ],
  note: 'Persona creation and configuration are handled through the Twill registration API.',
};

describe('personaBlocks', () => {
  test('leads with the selected profile headline carrying the Refresh accessory', () => {
    const blocks = personaBlocks(data, 'u1', false, emoji, emojiParts);
    const head = blocks[0] as Any;
    expect(head['kind']).toBe('section');
    // No emoji is registered in this test, so the unicode fallback applies.
    expect(String(head['content'])).toContain('🟢');
    expect(String(head['content'])).toContain('Dumby');
    expect(String(head['content'])).toContain('Online');
    // UR-20261012-054 — the count is of CLAIMED modules, and there is no command count.
    expect(String(head['content'])).toContain('2 claimed modules');
    const accessory = head['accessory'] as Any;
    expect(accessory['label']).toBe('Refresh');
    // The selected profile rides along so Refresh does not drop the member back to the running one.
    expect(accessory['customId']).toBe('dumby:act:u1:refresh:persona:main');
  });

  test('carries the profile switcher, marking the profile that is running the command', () => {
    const switcher = personaBlocks(data, 'u1', false, emoji, emojiParts).find(
      (b) => (b as Any)['kind'] === 'select',
    ) as Any;
    expect(switcher['customId']).toBe('dumby:act:u1:profile:persona');
    const options = switcher['options'] as Array<Any>;
    expect(options.map((o) => o['value'])).toEqual(['main', 'p-2']);
    expect(String(options[0]?.['description'])).toContain('Running this command');
    expect(options[0]?.['default']).toBe(true);
  });

  test('renders the identity as one field line and never restates the guild', () => {
    const identity = personaBlocks(data, 'u1', false, emoji, emojiParts).find((b) =>
      String((b as Any)['content']).includes('Identity'),
    ) as Any;
    expect(String(identity['content'])).toContain('1422973358818988155');
    expect(String(identity['content'])).toContain('Prohibited');
    expect(String(identity['content'])).not.toContain('Bound Server');
  });

  test('lists each tier with its CLAIM count and NO command inventory (UR-20261012-054)', () => {
    // The command inventory was removed by request: a profile's commands are the framework's, not a
    // property of the profile, and listing them buried the one thing this section is for.
    const blocks = personaBlocks(data, 'u1', false, emoji, emojiParts);
    const standard = blocks.find((b) =>
      String((b as Any)['content']).startsWith('**Standard**'),
    ) as Any;
    expect(String(standard['content'])).toContain('claimed');
    const all = blocks.map((b) => String((b as Any)['content'] ?? '')).join('\n');
    expect(all).not.toContain('`/hello`');
    expect(all).not.toContain('`/persona`');
  });

  test('the profile switcher is TRAILING, so it renders below the footer', () => {
    const switcher = personaBlocks(data, 'u1', false, emoji, emojiParts).find(
      (b) => (b as Any)['kind'] === 'select',
    ) as Any;
    expect(switcher['placement']).toBe('trailing');
  });

  test('ends with the Twill note', () => {
    const blocks = personaBlocks(data, 'u1', false, emoji, emojiParts);
    expect(String((blocks[blocks.length - 1] as Any)['content'])).toContain(
      'Twill registration API',
    );
  });

  test('offers the Info control ONLY on a persona profile, and only to an admin (UR-20261012-054)', () => {
    // The main bot is not a persona: no OAuth redirect to register, nothing to invite. A setup control
    // there was meaningless, so it is not rendered.
    const onMain = personaBlocks(data, 'u1', true, emoji, emojiParts);
    expect(onMain.some((b) => (b as Any)['kind'] === 'row')).toBe(false);

    const personaView = { ...data, selectedProfileId: 'p-2' };
    const asMember = personaBlocks(personaView, 'u1', false, emoji, emojiParts);
    expect(asMember.some((b) => (b as Any)['kind'] === 'row')).toBe(false);

    const asAdmin = personaBlocks(personaView, 'u1', true, emoji, emojiParts);
    const row = asAdmin.find((b) => (b as Any)['kind'] === 'row') as Any;
    const buttons = row['buttons'] as Array<Any>;
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.['customId']).toBe('dumby:persona-setup:u1:999000111222333444');
    expect(buttons[0]?.['label']).toBe('');
    // NO invite link anywhere: whether the redirect is registered cannot be read from Discord, so a
    // link offered here would be a guess.
    expect(buttons.some((b) => b['url'] !== undefined)).toBe(false);
  });

  test('states presence in the headline subtext, separately from the online state', () => {
    const away = {
      ...data,
      selectedProfileId: 'p-2',
      currentProfileId: 'p-2',
    };
    const head = personaBlocks(away, 'u1')[0] as Any;
    expect(String(head['content'])).toContain('Online');
    expect(String(head['content'])).toContain('Not in this guild yet');
  });

  test('disables the switcher when only one profile is active', () => {
    const single = { ...data, profiles: [data.profiles[0]] };
    const switcher = personaBlocks(single, 'u1').find(
      (b) => (b as Any)['kind'] === 'select',
    ) as Any;
    expect(switcher['disabled']).toBe(true);
  });

  test('tolerates missing data', () => {
    const blocks = personaBlocks(undefined, 'u1');
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(String((blocks[0] as Any)['content'])).toContain('Unavailable');
  });

  test('a profile with no claimed modules says so instead of rendering an empty section', () => {
    const blocks = personaBlocks(
      {
        status: 'online',
        selectedProfileId: 'p-2',
        profiles: [
          {
            id: 'p-2',
            name: 'Aurora',
            isMain: false,
            applicationId: '9',
            shards: '1',
            dmBehavior: 'Prohibited',
            statusKind: 'online',
            statusLabel: 'Online',
            present: true,
            hasOAuth: false,
            inviteUrl: '',
            moduleCount: 0,
            commandCount: 0,
          },
        ],
        tiers: [],
      },
      'u1',
    );
    const all = blocks.map((b) => String((b as Any)['content'] ?? '')).join('\n');
    expect(all).toContain('No claimed modules');
  });
});

describe('emoji ids are per-application (UR-20261012-057)', () => {
  test('a persona does NOT borrow the main bot\u2019s emoji ids', () => {
    // The bug: the registry was one process-wide map, so a persona's page embedded the MAIN BOT's ids
    // — and Discord renders an id belonging to another application as the literal `:dumby_browse:`,
    // which is exactly what the operator saw.
    resetModuleEmojis();
    registerModuleEmoji('dumby_status_online', '111'); // the default (main bot) scope
    registerModuleEmoji('dumby_status_online', '999', 'persona-app');

    const main = personaBlocks({ ...data, selectedProfileId: 'p-2' }, 'u1');
    const persona = personaBlocks({ ...data, selectedProfileId: 'p-2' }, 'u1', {
      applicationId: 'persona-app',
    });

    expect(JSON.stringify(main)).toContain('<:dumby_status_online:111>');
    expect(JSON.stringify(persona)).toContain('<:dumby_status_online:999>');
    // And the persona NEVER carries the main bot's emoji id.
    expect(JSON.stringify(persona)).not.toContain('<:dumby_status_online:111>');
    resetModuleEmojis();
  });

  test('an application with no emojis falls back to unicode, never to another app\u2019s id', () => {
    resetModuleEmojis();
    registerModuleEmoji('dumby_status_online', '111'); // main bot only
    const other = personaBlocks({ ...data, selectedProfileId: 'p-2' }, 'u1', {
      applicationId: 'unknown-app',
    });
    expect(JSON.stringify(other)).not.toContain('<:dumby_status_online:111>');
    resetModuleEmojis();
  });
});
