import { describe, expect, test } from 'vitest';
import { personaBlocks } from '../../src/rendering/persona-blocks.js';

type Any = Record<string, unknown>;

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
      statusKind: 'active',
      statusLabel: 'Active',
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
    const blocks = personaBlocks(data, 'u1');
    const head = blocks[0] as Any;
    expect(head['kind']).toBe('section');
    // No emoji is registered in this test, so the unicode fallback applies.
    expect(String(head['content'])).toContain('🟢');
    expect(String(head['content'])).toContain('Dumby');
    expect(String(head['content'])).toContain('Online');
    expect(String(head['content'])).toContain('2 modules');
    const accessory = head['accessory'] as Any;
    expect(accessory['label']).toBe('Refresh');
    expect(accessory['customId']).toBe('dumby:act:u1:refresh:persona');
  });

  test('carries the profile switcher, marking the profile that is running the command', () => {
    const switcher = personaBlocks(data, 'u1').find((b) => (b as Any)['kind'] === 'select') as Any;
    expect(switcher['customId']).toBe('dumby:act:u1:profile:persona');
    const options = switcher['options'] as Array<Any>;
    expect(options.map((o) => o['value'])).toEqual(['main', 'p-2']);
    expect(String(options[0]?.['description'])).toContain('Running this command');
    expect(options[0]?.['default']).toBe(true);
  });

  test('renders the identity as one field line and never restates the guild', () => {
    const identity = personaBlocks(data, 'u1').find((b) =>
      String((b as Any)['content']).includes('Identity'),
    ) as Any;
    expect(String(identity['content'])).toContain('1422973358818988155');
    expect(String(identity['content'])).toContain('Prohibited');
    expect(String(identity['content'])).not.toContain('Bound Server');
  });

  test('lists each tier with its module count and the commands the profile owns', () => {
    const blocks = personaBlocks(data, 'u1');
    const core = blocks.find((b) => String((b as Any)['content']).startsWith('**Core**')) as Any;
    expect(String(core['content'])).toContain('2 modules');
    expect(String(core['content'])).toContain('`/persona`');
    const standard = blocks.find((b) =>
      String((b as Any)['content']).startsWith('**Standard**'),
    ) as Any;
    expect(String(standard['content'])).toContain('`/hello`');
  });

  test('ends with the Twill note', () => {
    const blocks = personaBlocks(data, 'u1');
    expect(String((blocks[blocks.length - 1] as Any)['content'])).toContain(
      'Twill registration API',
    );
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

  test('shows an em dash for a module that declares no commands', () => {
    const blocks = personaBlocks(
      { status: 'online', tiers: [{ tier: 'core', modules: [{ name: 'Empty', commands: [] }] }] },
      'u1',
    );
    const core = blocks.find((b) => String((b as Any)['content']).startsWith('**Core**')) as Any;
    expect(String(core['content'])).toContain('—');
  });
});
