import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { CoreRenderer, blockZone } from '../../src/rendering/core-renderer.js';
import type { RenderBlock } from '../../src/rendering/core-renderer.js';
import { ComponentType } from '../../src/shared/utils/components-v2.js';

/**
 * §1.3 — the zone grammar for a Mode D page.
 *
 *   ABOVE the footer — content and inline controls (text, thumbnail, section, whose accessory is the
 *     INLINE button or a thumbnail). A select never appears here.
 *   BELOW the footer — the action zone: action-row buttons and every select kind. Other content never
 *     appears here, and neither does an inline button (it is a section accessory, so it travels with
 *     its section, above).
 *
 * The zone is a property of the BLOCK KIND, not of the list a page declared it in, so a misplaced
 * block is relocated and the relocation is logged rather than rendered where it does not belong.
 */
function makeLogger() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

type Inner = Array<{ type: number; content?: string; components?: Array<{ type: number }> }>;

function innerOf(message: { components: unknown[] }): Inner {
  const container = message.components[0] as { components: Inner };
  return container.components;
}

const footerIndex = (inner: Inner): number =>
  inner.findIndex(
    (c) => c.type === ComponentType.TEXT_DISPLAY && (c.content ?? '').includes('[browse]'),
  );

const textIndex = (inner: Inner, needle: string): number =>
  inner.findIndex(
    (c) => c.type === ComponentType.TEXT_DISPLAY && (c.content ?? '').includes(needle),
  );

/** An action row whose first child is a select. */
const selectIndex = (inner: Inner): number =>
  inner.findIndex(
    (c) =>
      c.type === ComponentType.ACTION_ROW &&
      c.components?.[0]?.type === ComponentType.STRING_SELECT,
  );

const buttonRowIndex = (inner: Inner): number =>
  inner.findIndex(
    (c) => c.type === ComponentType.ACTION_ROW && c.components?.[0]?.type === ComponentType.BUTTON,
  );

describe('blockZone', () => {
  test('content and inline controls belong above; selects belong below; action rows to both', () => {
    expect(blockZone({ kind: 'text', content: 'x' })).toBe('above');
    expect(blockZone({ kind: 'thumbnail', url: 'https://x/y.png' })).toBe('above');
    expect(
      blockZone({ kind: 'section', content: 'x', accessory: { label: 'b', customId: 'c' } }),
    ).toBe('above');
    expect(blockZone({ kind: 'select', customId: 'c', placeholder: 'p', options: [] })).toBe(
      'below',
    );
    expect(blockZone({ kind: 'entitySelect', selectType: 'user', customId: 'c' })).toBe('below');
    expect(blockZone({ kind: 'row', buttons: [] })).toBe('both');
  });
});

describe('Mode D zone grammar', () => {
  const render = (
    blocks: readonly RenderBlock[],
    interactive: readonly RenderBlock[],
    logger: Logger,
  ) =>
    new CoreRenderer({ logger }).render({
      surface: 'Modules',
      moduleId: 'browse',
      displayName: 'Browse',
      mode: 'D',
      sections: ['body'],
      blocks,
      interactive,
    });

  test('a select declared among the CONTENT blocks renders below the footer', () => {
    const logger = makeLogger();
    const inner = innerOf(
      render(
        [
          { kind: 'text', content: 'ABOVE-TEXT' },
          {
            kind: 'select',
            customId: 'pick',
            placeholder: 'Pick',
            options: [{ label: 'a', value: 'a' }],
          },
        ],
        [],
        logger,
      ),
    );

    const footer = footerIndex(inner);
    expect(footer).toBeGreaterThan(-1);
    expect(textIndex(inner, 'ABOVE-TEXT')).toBeLessThan(footer);
    expect(selectIndex(inner)).toBeGreaterThan(footer);
    expect(logger.warn).toHaveBeenCalledWith(
      'render-block-relocated',
      expect.objectContaining({ kind: 'select', from: 'above', to: 'below' }),
    );
  });

  test('content declared in the INTERACTIVE list renders above the footer', () => {
    const logger = makeLogger();
    const inner = innerOf(render([], [{ kind: 'text', content: 'MISPLACED-BELOW' }], logger));

    const footer = footerIndex(inner);
    expect(textIndex(inner, 'MISPLACED-BELOW')).toBeLessThan(footer);
    expect(logger.warn).toHaveBeenCalledWith(
      'render-block-relocated',
      expect.objectContaining({ kind: 'text', from: 'below', to: 'above' }),
    );
  });

  test('an action row is accepted in BOTH zones — above the action bar, below the actions', () => {
    const logger = makeLogger();
    const inner = innerOf(
      render(
        [{ kind: 'row', buttons: [{ label: 'Above', customId: 'above' }] }],
        [{ kind: 'row', buttons: [{ label: 'Below', customId: 'below' }] }],
        logger,
      ),
    );

    const footer = footerIndex(inner);
    // The first button row sits above the footer; the last sits below it.
    const rows = inner
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.type === ComponentType.ACTION_ROW)
      .map(({ i }) => i);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]).toBeLessThan(footer);
    expect(rows[rows.length - 1]).toBeGreaterThan(footer);
    // No relocation: an action row belongs in whichever zone it was declared.
    expect(logger.warn).not.toHaveBeenCalledWith('render-block-relocated', expect.anything());
  });

  test('an inline button never reaches the zone below the footer', () => {
    const logger = makeLogger();
    const inner = innerOf(
      render(
        [],
        [
          {
            kind: 'section',
            content: 'INLINE-CONTENT',
            accessory: { label: 'Inline', customId: 'inline' },
          },
        ],
        logger,
      ),
    );

    const footer = footerIndex(inner);
    // The section — and therefore its inline button — was relocated above the footer.
    const sectionIdx = inner.findIndex((c) => c.type === ComponentType.SECTION);
    expect(sectionIdx).toBeGreaterThan(-1);
    expect(sectionIdx).toBeLessThan(footer);
    expect(logger.warn).toHaveBeenCalledWith(
      'render-block-relocated',
      expect.objectContaining({ kind: 'section', from: 'below', to: 'above' }),
    );
  });

  test('without a logger the grammar still holds and nothing throws', () => {
    const inner = innerOf(
      new CoreRenderer().render({
        surface: 'Modules',
        moduleId: 'browse',
        displayName: 'Browse',
        mode: 'D',
        sections: ['body'],
        blocks: [
          {
            kind: 'select',
            customId: 'pick',
            placeholder: 'Pick',
            options: [{ label: 'a', value: 'a' }],
          },
        ],
      }),
    );
    const footer = footerIndex(inner);
    expect(selectIndex(inner)).toBeGreaterThan(footer);
    expect(buttonRowIndex(inner)).toBe(-1);
  });
});

describe('the renderer owns the separators (item 1)', () => {
  const renderer = new CoreRenderer();
  const kinds = (message: { components: unknown[] }): string[] =>
    (message.components[0] as { components: Array<{ type: number }> }).components.map((c) =>
      c.type === 14 ? 'rule' : 'block',
    );

  test('a rule is inserted below media, so the next block never sits against it', () => {
    const message = renderer.render({
      surface: 'Page',
      blocks: [
        { kind: 'thumbnail', url: 'https://x/y.png' },
        { kind: 'text', content: 'after the media' },
      ],
    });
    // thumbnail → rule → text
    expect(kinds(message).filter((k) => k === 'rule').length).toBeGreaterThanOrEqual(1);
  });

  test('separators are NEVER doubled', () => {
    const message = renderer.render({
      surface: 'Page',
      blocks: [
        { kind: 'text', content: 'one' },
        { kind: 'thumbnail', url: 'https://x/y.png' },
        { kind: 'text', content: 'two' },
      ],
    });
    const k = kinds(message);
    for (let i = 1; i < k.length; i += 1) {
      expect(`${k[i - 1]},${k[i]}`).not.toBe('rule,rule');
    }
  });

  test('blocks render in DECLARATION order', () => {
    const message = renderer.render({
      surface: 'Page',
      blocks: [
        { kind: 'text', content: 'first' },
        { kind: 'text', content: 'second' },
        { kind: 'text', content: 'third' },
      ],
    });
    const texts = JSON.stringify(message);
    expect(texts.indexOf('first')).toBeLessThan(texts.indexOf('second'));
    expect(texts.indexOf('second')).toBeLessThan(texts.indexOf('third'));
  });
});

describe('an invalid schema is INVALID, not rendered around (item 6)', () => {
  const renderer = new CoreRenderer();
  test('an unknown block kind is refused', () => {
    expect(() =>
      renderer.render({
        surface: 'Page',
        blocks: [{ kind: 'not-a-kind', content: 'x' } as never],
      }),
    ).toThrow();
  });

  test('a select with no options is refused', () => {
    expect(() =>
      renderer.render({
        surface: 'Page',
        blocks: [{ kind: 'select', customId: 'c', options: [], placeholder: 'pick' } as never],
      }),
    ).toThrow();
  });

  test('a well-formed page still renders', () => {
    expect(() =>
      renderer.render({
        surface: 'Page',
        blocks: [
          { kind: 'text', content: 'fine' },
          {
            kind: 'select',
            customId: 'c',
            placeholder: 'pick',
            options: [{ label: 'A', value: 'a' }],
          },
        ],
      }),
    ).not.toThrow();
  });
});

describe('a separator is NOT a block — the renderer owns them (item 1)', () => {
  const renderer = new CoreRenderer();

  test('a module declaring a separator block is INVALID, not accommodated', () => {
    // There is no `separator` kind, so a module cannot place one. The separators on /health are the
    // renderer's own — inserted below media and between content blocks — which is why the page has
    // them without any module asking.
    expect(() =>
      renderer.render({
        surface: 'Page',
        blocks: [{ kind: 'separator' } as never],
      }),
    ).toThrow();
  });

  test('and a separator among otherwise valid blocks is still refused', () => {
    expect(() =>
      renderer.render({
        surface: 'Page',
        blocks: [
          { kind: 'text', content: 'one' },
          { kind: 'separator' } as never,
          { kind: 'text', content: 'two' },
        ],
      }),
    ).toThrow();
  });

  test('the renderer inserts them itself, so a valid page still gets rules', () => {
    const message = renderer.render({
      surface: 'Page',
      blocks: [
        { kind: 'text', content: 'one' },
        { kind: 'text', content: 'two' },
      ],
    });
    const inner = (message.components[0] as { components: Array<{ type: number }> }).components;
    expect(inner.some((c) => c.type === 14)).toBe(true);
  });
});
