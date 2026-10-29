import { test, expect, describe } from 'vitest';
import {
  CoreRenderer,
  derivePageSections,
} from '../../../../apps/main/src/rendering/core-renderer.js';
import { dialNavSelect } from '../../../../apps/main/src/rendering/dashboard-nav.js';
import { modulesBlocks } from '../src/blocks/modules.blocks.js';

/**
 * /modules reported MODULE_ERROR in production. This walks the whole path the router takes for it —
 * the sections derivation, the content blocks, the dial, and the renderer with all three together —
 * so a break in any link is caught here rather than in a live server. It passed while the failure was
 * reported, which is what narrowed the search to the page data and the dispatch above it.
 *
 * The accent is a hex STRING: `render()` declares it as one, and a number reaching `accentToInt`
 * throws on `.replace`.
 */
const pageData = {
  title: 'Installed Modules',
  lines: ['📦 Hello World (standard) — A simple hello world module.'],
  modules: [
    {
      id: 'hello-world',
      name: 'Hello World',
      tier: 'standard',
      description: 'A simple hello world module for testing.',
      icon: '<:dumby_modules:1>',
    },
  ],
  page: 0,
  pageTotal: 1,
  total: 1,
  navigation: [
    {
      id: 'hello-world',
      name: 'Hello World',
      description: 'A simple hello world module for testing.',
      page: 0,
      iconName: 'dumby_modules',
    },
  ],
};

describe('the /modules render path is whole', () => {
  test('derivePageSections accepts the /modules page data', () => {
    const sections = derivePageSections('modules', pageData as unknown as Record<string, unknown>);
    expect(Array.isArray(sections)).toBe(true);
  });

  test('modulesBlocks builds from the same data', () => {
    const blocks = modulesBlocks(pageData as unknown as Record<string, unknown>, 'u1');
    expect(blocks.length).toBeGreaterThan(0);
  });

  test('the dial builds from the same navigation', () => {
    const block = dialNavSelect({
      invokerId: 'u1',
      command: 'modules',
      entries: pageData.navigation.map((e) => ({
        ...e,
        icon: { name: 'dumby_modules', id: '1' },
      })),
      currentPage: 0,
      homeIcon: { name: 'dumby_home', id: '2' },
      fallbackIcon: { name: 'dumby_module', id: '3' },
    });
    expect(block.kind).toBe('select');
  });

  test('the renderer accepts sections + blocks + the dial together', async () => {
    const renderer = new CoreRenderer();
    const out = await renderer.render({
      surface: 'Modules',
      displayName: 'Dumby Suite | Modules',
      moduleId: 'modules',
      accent: '#FFCA6D',
      sections: derivePageSections(
        'modules',
        pageData as unknown as Record<string, unknown>,
      ) as never,
      blocks: modulesBlocks(pageData as unknown as Record<string, unknown>, 'u1'),
      interactive: [
        dialNavSelect({
          invokerId: 'u1',
          command: 'modules',
          entries: pageData.navigation.map((e) => ({
            ...e,
            icon: { name: 'dumby_modules', id: '1' },
          })),
          currentPage: 0,
          homeIcon: { name: 'dumby_home', id: '2' },
          fallbackIcon: { name: 'dumby_module', id: '3' },
        }),
      ],
    });
    expect(out.components.length).toBeGreaterThan(0);
  });
});
