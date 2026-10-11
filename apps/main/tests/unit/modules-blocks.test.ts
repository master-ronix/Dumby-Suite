import { describe, expect, test } from 'vitest';
import { modulesBlocks } from '../../src/rendering/modules-blocks.js';

type Any = Record<string, unknown>;

const data = {
  total: 2,
  page: 0,
  pageTotal: 1,
  modules: [
    {
      id: 'health',
      name: 'health',
      tier: 'core',
      description: 'System health',
      icon: '<:dumby_health:1>',
    },
    {
      id: 'hello-world',
      name: 'Hello World',
      tier: 'standard',
      description: 'Hello test',
      icon: '',
    },
  ],
};

describe('modulesBlocks', () => {
  test('leads with a header line and one Section per module with an inline Info accessory', () => {
    const blocks = modulesBlocks(data, 'u1');
    const head = blocks[0] as Any;
    expect(head['kind']).toBe('text');
    expect(String(head['content'])).toContain('Installed Modules');

    const sections = blocks.filter((block) => block.kind === 'section') as unknown as Any[];
    expect(sections.length).toBe(2);
    expect(String(sections[0]?.['content'])).toContain('health');
    expect(String(sections[0]?.['content'])).toContain('Core');
    expect(String(sections[0]?.['content'])).toContain('System health');
    const accessory = sections[0]?.['accessory'] as Any;
    expect(accessory['label']).toBe('Info');
    expect(accessory['customId']).toBe('dumby:info:u1:health');
  });

  test('shows the page indicator only when there is more than one page', () => {
    const head = modulesBlocks({ ...data, page: 1, pageTotal: 3 }, 'u1')[0] as Any;
    expect(String(head['content'])).toContain('page 2/3');
  });

  test('tolerates missing data (header only)', () => {
    const blocks = modulesBlocks(undefined, 'u2');
    expect(blocks.length).toBe(1);
    expect((blocks[0] as Any)['kind']).toBe('text');
  });
});
