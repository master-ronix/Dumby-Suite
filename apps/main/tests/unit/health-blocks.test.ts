import { describe, expect, test } from 'vitest';
import { healthBlocks } from '@module-health-blocks';
import {
  customEmojiParts,
  customEmojiRef,
  registerModuleEmoji,
} from '../../src/rendering/module-icons.js';

// UR-20261029-113 — the builder no longer reaches into the framework for emoji ids: the page hands it
// the resolvers. These are the same two functions the page receives at dispatch.
// The builder used to default to the DEFAULT scope; these registrations are there.
const SCOPE = '';
const emoji = (name: string): string | undefined => customEmojiRef(name, SCOPE);
const emojiParts = (name: string): { id: string; name: string } | undefined =>
  customEmojiParts(name, SCOPE);

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
    const blocks = healthBlocks(data, 'u1', emoji, emojiParts);
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
    const blocks = healthBlocks(data, 'u1', emoji, emojiParts);
    const texts = blocks.filter((block) => block.kind === 'text') as unknown as Any[];
    expect(texts.length).toBe(2);
    expect(String(texts[0]?.['content'])).toContain('🟢');
    expect(String(texts[0]?.['content'])).toContain('Discord API');
    expect(String(texts[0]?.['content'])).toContain('Gateway Ping: 42ms');
    expect(String(texts[1]?.['content'])).toContain('🔴');
    expect(String(texts[1]?.['content'])).toContain('Cache');
  });

  test('a degraded subsystem gets the DEGRADED mark, not the online one', () => {
    // The three states are distinct marks; before this only `ok` and `down` were exercised, so the
    // degraded arm — the whole reason the third icon exists — was never run.
    for (const status of ['warn', 'degraded'] as const) {
      const blocks = healthBlocks(
        {
          status: 'degraded',
          statusLabel: 'Degraded',
          groups: [{ name: 'Cache', status, rows: [] }],
        },
        'u1',
        emoji,
        emojiParts,
      );
      const line = String((blocks[1] as Any)['content']);
      expect(line).toContain('Cache');
      expect(line).not.toContain('🟢');
    }
  });

  test('an unknown or absent status falls back rather than throwing', () => {
    const blocks = healthBlocks(
      {
        status: 'something-new',
        statusLabel: 'Unknown',
        groups: [{ name: 'Mystery', rows: [] }],
      },
      'u1',
      emoji,
      emojiParts,
    );
    // The headline and the group line both render; an unrecognised state is a white circle.
    expect(String((blocks[0] as Any)['content'])).toContain('Unknown');
    expect(String((blocks[1] as Any)['content'])).toContain('Mystery');
  });

  test('tolerates missing data (defaults to operational with no groups)', () => {
    const blocks = healthBlocks(undefined, 'u2', emoji, emojiParts);
    expect(blocks.length).toBe(1);
    const head = blocks[0] as Any;
    expect(head['kind']).toBe('section');
    expect(String(head['content'])).toContain('Operational');
  });
});

describe('healthBlocks tolerates malformed group data', () => {
  // The page data crosses a module boundary, so the shape is not guaranteed. Every guard here is a
  // branch, and an unguarded one would throw inside a render.
  test('a non-array groups value yields no group lines', () => {
    const blocks = healthBlocks(
      { status: 'operational', groups: 'nonsense' },
      'u1',
      emoji,
      emojiParts,
    );
    expect(blocks).toHaveLength(1);
  });

  test('entries that are not objects, or lack a name or rows, are skipped', () => {
    const blocks = healthBlocks(
      {
        status: 'operational',
        groups: [
          null,
          'text',
          { name: 'NoRows' },
          { rows: [['a', 'b']] },
          { name: 'Good', rows: [['a', 'b']] },
        ],
      },
      'u1',
      emoji,
      emojiParts,
    );
    // Only the well-formed group renders.
    const lines = blocks.slice(1).map((b) => String((b as Any)['content']));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Good');
  });

  test('a malformed row inside a valid group is dropped, not rendered as junk', () => {
    const blocks = healthBlocks(
      { status: 'ok', groups: [{ name: 'G', rows: [['only-one'], ['a', 'b']] }] },
      'u1',
      emoji,
      emojiParts,
    );
    const line = String((blocks[1] as Any)['content']);
    expect(line).toContain('a: b');
    expect(line).not.toContain('only-one');
  });
});

describe('every health column carries its own mark', () => {
  test('rows are marked by label, and the two uptimes are told apart by their GROUP', () => {
    registerModuleEmoji('dumby_metric_uptime', '901', '');
    registerModuleEmoji('dumby_metric_profile', '902', '');
    registerModuleEmoji('dumby_metric_ping', '903', '');
    registerModuleEmoji('dumby_metric_status', '904', '');

    const blocks = healthBlocks(
      {
        status: 'operational',
        groups: [
          {
            name: 'Discord API',
            status: 'ok',
            rows: [
              ['Gateway Ping', '19ms'],
              ['Gateway Status', 'Connected'],
            ],
          },
          { name: 'Host Process (shared)', status: 'ok', rows: [['Host Uptime', '0d 0h 5m']] },
          { name: 'Profile Runtime', status: 'ok', rows: [['Uptime', '0d 0h 3m']] },
        ],
      },
      'u1',
      emoji,
      emojiParts,
    );
    const lines = blocks.slice(1).map((b) => String((b as Any)['content']));

    // The label carries its mark, so the board is scannable rather than a wall of "Label: value".
    expect(lines[0]).toContain('<:dumby_metric_ping:903>');
    expect(lines[0]).toContain('<:dumby_metric_status:904>');
    // Same word, different group: the host's uptime and the profile's must not share a mark.
    expect(lines[1]).toContain('<:dumby_metric_uptime:901>');
    expect(lines[2]).toContain('<:dumby_metric_profile:902>');
  });

  test('a row with no mark still renders — an unknown label is not an error', () => {
    const blocks = healthBlocks(
      { status: 'ok', groups: [{ name: 'Mystery', rows: [['Something New', '1']] }] },
      'u1',
      emoji,
      emojiParts,
    );
    expect(String((blocks[1] as Any)['content'])).toContain('Something New: 1');
  });
});
