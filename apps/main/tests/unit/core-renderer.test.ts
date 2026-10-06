import { describe, expect, test, vi } from 'vitest';
import { CoreRenderer, InvalidRenderDescriptorError } from '../../src/rendering/core-renderer.js';
import {
  ComponentType,
  type Component,
  type ContainerComponent,
  type ComponentsV2Message,
  type TextDisplayComponent,
} from '../../src/shared/utils/components-v2.js';

function textContents(message: ComponentsV2Message): string[] {
  const out: string[] = [];
  const walk = (components: Component[]): void => {
    for (const component of components) {
      if (component.type === ComponentType.TEXT_DISPLAY) {
        out.push((component as TextDisplayComponent).content);
      }
      if (
        'components' in component &&
        Array.isArray((component as ContainerComponent).components)
      ) {
        walk((component as ContainerComponent).components);
      }
    }
  };
  const frame = message.components[0];
  if (frame !== undefined && 'components' in frame) {
    walk((frame as ContainerComponent).components);
  } else {
    walk(message.components);
  }
  return out;
}

function frame(message: ComponentsV2Message): ContainerComponent {
  return message.components[0] as ContainerComponent;
}

const renderer = new CoreRenderer();

describe('CoreRenderer grammar', () => {
  test('every render is a Components V2 message with the official blurple accent', () => {
    const message = renderer.render({ surface: 'Health', summary: 'all systems nominal' });

    expect(message.flags).toBe(32768);
    expect(frame(message).type).toBe(ComponentType.CONTAINER);
    expect(frame(message).accent_color).toBe(0x5865f2);
  });

  test('the title carries the module identity and the attribution occupies its own line', () => {
    const message = renderer.render({ surface: 'Health', summary: 'ok' });

    const title = textContents(message).find((content) => content.startsWith('Dumby | Health'));
    expect(title).toBeDefined();
    expect(title).toContain('-# Developed by Quixotic Mnemonics v5.0.0');
  });

  test('defaults to Mode D for direct invocations', () => {
    const message = renderer.render({ surface: 'Dashboard', sections: ['a', 'b'] });

    expect(textContents(message).some((content) => content.includes('Mode D'))).toBe(true);
    expect(textContents(message).filter((content) => content === 'a' || content === 'b')).toEqual([
      'a',
      'b',
    ]);
  });

  test('Mode D renders every section divider-separated', () => {
    const message = renderer.render({ surface: 'Health', mode: 'D', sections: ['a', 'b', 'c'] });

    const contents = textContents(message);
    expect(contents).toContain('a');
    expect(contents).toContain('b');
    expect(contents).toContain('c');
    expect(contents.some((content) => content.includes('Mode D'))).toBe(true);
  });

  test('Mode M collapses long listings to the first section and a count', () => {
    const message = renderer.render({
      surface: 'Modules',
      mode: 'M',
      sections: ['first', 'second', 'third'],
    });

    const contents = textContents(message);
    expect(contents).toContain('first\n+2 more');
    expect(contents).not.toContain('second');
    expect(contents.some((content) => content.includes('Mode M'))).toBe(true);
  });

  test('Mode C renders a single condensed status line', () => {
    const message = renderer.render({
      surface: 'Health',
      mode: 'C',
      summary: 'all systems nominal',
    });

    const contents = textContents(message);
    expect(contents.some((content) => content.startsWith('Health: all systems nominal'))).toBe(
      true,
    );
    expect(contents.some((content) => content.includes('Mode C'))).toBe(true);
  });

  test('mode changes density, never the reported surface', () => {
    const d = textContents(renderer.render({ surface: 'Health', mode: 'D', summary: 'ok' }));
    const c = textContents(renderer.render({ surface: 'Health', mode: 'C', summary: 'ok' }));
    expect(d.some((content) => content.includes('Dumby | Health'))).toBe(true);
    expect(c.some((content) => content.includes('Dumby | Health'))).toBe(true);
  });

  test('rejects a descriptor with no sections and no summary', () => {
    expect(() => renderer.render({ surface: 'Health' })).toThrow(InvalidRenderDescriptorError);
  });

  test('rejects unknown modes', () => {
    expect(() => renderer.render({ surface: 'Health', mode: 'X' })).toThrow(
      InvalidRenderDescriptorError,
    );
  });
});

describe('CoreRenderer buffer embed', () => {
  test('the buffer is mode-neutral and only occupies the interaction slot', () => {
    const message = renderer.renderBuffer({ surface: 'Health' });

    const contents = textContents(message);
    expect(frame(message).accent_color).toBe(0x5865f2);
    expect(contents.some((content) => content.startsWith('Dumby | Health'))).toBe(true);
    expect(contents.some((content) => content.includes('Preparing Health'))).toBe(true);
  });

  test('sendBuffer replies when the interaction has not been acknowledged', async () => {
    const interaction = { replied: false, deferred: false, reply: vi.fn(), editReply: vi.fn() };
    await renderer.sendBuffer(interaction, { surface: 'Health' });

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  test('sendBuffer edits in place when the interaction was already acknowledged', async () => {
    const interaction = { replied: true, deferred: false, reply: vi.fn(), editReply: vi.fn() };
    await renderer.sendBuffer(interaction, { surface: 'Health' });

    expect(interaction.reply).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
  });
});

describe('CoreRenderer formal notice frame', () => {
  test('a notice carries the machine-ready reason code and trace correlation ID', () => {
    const message = renderer.renderNotice({
      surface: 'Health',
      reason: 'RATE_LIMITED',
      traceId: 'tr_abc123',
    });

    const contents = textContents(message);
    expect(frame(message).accent_color).toBe(0x5865f2);
    expect(contents.some((content) => content.includes('reason: RATE_LIMITED'))).toBe(true);
    expect(contents.some((content) => content.includes('trace: tr_abc123'))).toBe(true);
  });

  test('the notice heading and explanation default per reason code', () => {
    const message = renderer.renderNotice({
      surface: 'Health',
      reason: 'UNKNOWN_COMMAND',
      traceId: 'tr_x',
    });

    const contents = textContents(message).join('\n');
    expect(contents).toContain('Unknown command');
    expect(contents).toContain('That command is not registered or is not available here.');
  });
});

describe('CoreRenderer descriptor normalization', () => {
  test('a handler returning nothing resolves to a Done summary', () => {
    expect(renderer.normalizeHandlerResult(undefined, { surface: 'Health' })).toEqual({
      surface: 'Health',
      summary: 'Done.',
    });
  });

  test('a handler returning a string uses it as the summary', () => {
    expect(renderer.normalizeHandlerResult('Pong', { surface: 'Health' })).toEqual({
      surface: 'Health',
      summary: 'Pong',
    });
  });

  test('a handler returning a render descriptor passes it through', () => {
    expect(
      renderer.normalizeHandlerResult(
        { surface: 'Health', mode: 'C', summary: 'ok' },
        { surface: 'Fallback' },
      ),
    ).toEqual({ surface: 'Health', mode: 'C', summary: 'ok' });
  });

  test('a handler returning a hand-built payload is rejected', () => {
    expect(() =>
      renderer.normalizeHandlerResult({ content: 'x', components: [] }, { surface: 'Health' }),
    ).toThrow(InvalidRenderDescriptorError);
  });
});

describe('CoreRenderer reason mapping', () => {
  test('maps known errors to their stable reason codes', () => {
    expect(
      renderer.noticeReasonFromError(
        Object.assign(new Error('x'), { name: 'CommandNotFoundError' }),
      ),
    ).toBe('UNKNOWN_COMMAND');
    expect(
      renderer.noticeReasonFromError(
        Object.assign(new Error('x'), { name: 'CommandScopeDeniedError' }),
      ),
    ).toBe('FORBIDDEN');
    expect(renderer.noticeReasonFromError(new Error('boom'))).toBe('MODULE_ERROR');
  });
});
