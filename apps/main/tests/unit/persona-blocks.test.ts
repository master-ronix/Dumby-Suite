import { describe, expect, test } from 'vitest';
import { personaBlocks } from '../../src/rendering/persona-blocks.js';

type Any = Record<string, unknown>;

const data = {
  status: 'online',
  summary: 'Dumby · 1 shard · 3 bound modules · 5 commands',
  identity: [
    ['Application ID', '1422973358818988155'],
    ['Display Name', 'Dumby'],
    ['DM Behavior', 'Prohibited (main bot)'],
  ],
  tiers: [
    {
      tier: 'core',
      modules: [
        { name: 'Persona', commands: ['persona'] },
        { name: 'Health', commands: ['health'] },
      ],
    },
    { tier: 'standard', modules: [{ name: 'Hello World', commands: ['hello'] }] },
  ],
  note: 'Persona creation and configuration are handled through the Twill registration API.',
};

describe('personaBlocks', () => {
  test('leads with a status headline carrying the Refresh accessory', () => {
    const blocks = personaBlocks(data, 'u1');
    const head = blocks[0] as Any;
    expect(head['kind']).toBe('section');
    expect(String(head['content'])).toContain('🟢');
    expect(String(head['content'])).toContain('Main Bot');
    expect(String(head['content'])).toContain('Online');
    expect(String(head['content'])).toContain('3 bound modules');
    const accessory = head['accessory'] as Any;
    expect(accessory['label']).toBe('Refresh');
    expect(accessory['customId']).toBe('dumby:act:u1:refresh:persona');
  });

  test('renders the identity as one compact field line', () => {
    const identity = personaBlocks(data, 'u1').find((b) =>
      String((b as Any)['content']).includes('Identity'),
    ) as Any;
    expect(String(identity['content'])).toContain('Application ID: 1422973358818988155');
    expect(String(identity['content'])).toContain('DM Behavior: Prohibited');
  });

  test('lists each tier with its modules and commands', () => {
    const blocks = personaBlocks(data, 'u1');
    const core = blocks.find((b) => String((b as Any)['content']).startsWith('**Core**')) as Any;
    expect(String(core['content'])).toContain('**Persona**');
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

  test('tolerates missing data', () => {
    const blocks = personaBlocks(undefined, 'u1');
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    expect(String((blocks[0] as Any)['content'])).toContain('Offline');
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
