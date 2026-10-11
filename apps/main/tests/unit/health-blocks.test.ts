import { describe, expect, test } from 'vitest';
import { healthBlocks } from '../../src/rendering/health-blocks.js';

type Any = Record<string, unknown>;

const data = {
  status: 'operational',
  statusLabel: 'Operational',
  summary: 'up 3d 4h · Node v22 · 8 modules',
  groups: [
    {
      name: 'Discord API',
      status: 'ok',
      rows: [
        ['Gateway Ping', '42ms'],
        ['Gateway Status', 'Connected'],
      ],
    },
    { name: 'Cache', status: 'down', rows: [['Redis Status', 'Unavailable']] },
  ],
};

describe('healthBlocks', () => {
  test('leads with a status headline carrying the Refresh accessory', () => {
    const blocks = healthBlocks(data, 'u1');
    const head = blocks[0] as Any;
    expect(head['kind']).toBe('section');
    expect(String(head['content'])).toContain('🟢');
    expect(String(head['content'])).toContain('Operational');
    expect(String(head['content'])).toContain('up 3d 4h');
    const accessory = head['accessory'] as Any;
    expect(accessory['label']).toBe('Refresh');
    expect(accessory['customId']).toBe('dumby:act:u1:refresh:health');
  });

  test('renders one line per subsystem with a status dot and its metrics', () => {
    const blocks = healthBlocks(data, 'u1');
    const texts = blocks.filter((block) => block.kind === 'text') as unknown as Any[];
    expect(texts.length).toBe(2);
    expect(String(texts[0]?.['content'])).toContain('🟢');
    expect(String(texts[0]?.['content'])).toContain('Discord API');
    expect(String(texts[0]?.['content'])).toContain('Gateway Ping: 42ms');
    expect(String(texts[1]?.['content'])).toContain('🔴');
    expect(String(texts[1]?.['content'])).toContain('Cache');
  });

  test('tolerates missing data (defaults to operational with no groups)', () => {
    const blocks = healthBlocks(undefined, 'u2');
    expect(blocks.length).toBe(1);
    const head = blocks[0] as Any;
    expect(head['kind']).toBe('section');
    expect(String(head['content'])).toContain('Operational');
  });
});
