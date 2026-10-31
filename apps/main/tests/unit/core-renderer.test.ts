import { describe, expect, test, vi } from 'vitest';
import {
  CoreRenderer,
  DirectInteractionResponseError,
  InvalidRenderDescriptorError,
} from '../../src/rendering/core-renderer.js';
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
  test('every render is a Components V2 message with the official amber accent', () => {
    const message = renderer.render({ surface: 'Health', summary: 'all systems nominal' });

    expect(message.flags).toBe(32768);
    expect(frame(message).type).toBe(ComponentType.CONTAINER);
    expect(frame(message).accent_color).toBe(0xffca6d);
  });

  test('the title carries the module identity and the attribution occupies its own line', () => {
    const message = renderer.render({ surface: 'Health', summary: 'ok' });

    const title = textContents(message).find((content) =>
      content.startsWith('**Dumby Suite | Health**'),
    );
    expect(title).toBeDefined();
    expect(title).toContain('-# Developed by Quixotic Mnemonics');
  });

  test('a registered developer renders verbatim, with no "@" handle (UR-20261011-013 R11)', () => {
    // The identity band shows the developer's display NAME — "Developed by Quixotic Mnemonics" —
    // not a handle. The registered value is rendered verbatim (no '@' prefix).
    const message = renderer.render({
      surface: 'Modules',
      devUsername: 'Quixotic Mnemonics',
      summary: 'ok',
    });
    const title = textContents(message).find((content) =>
      content.startsWith('**Dumby Suite | Modules**'),
    );
    expect(title).toContain('-# Developed by Quixotic Mnemonics');
    expect(title).not.toContain('@');
  });

  test('the module-page footer is `<name> [<id>]` and carries no attribution', () => {
    const message = renderer.render({
      surface: 'Hello World',
      moduleId: 'hello-world',
      sections: ['hi'],
    });
    const contents = textContents(message);
    expect(contents).toContain('-# Hello World [hello-world]');
    // the developer credit stays in the identity band, not the footer
    expect(contents.some((content) => content.includes('Developed by'))).toBe(true);
  });

  test('a declared display name is used in the footer', () => {
    const message = renderer.render({
      surface: 'X',
      moduleId: 'custom-slug',
      displayName: 'Custom Name',
      sections: ['hi'],
    });
    expect(textContents(message)).toContain('-# Custom Name [custom-slug]');
  });

  test('defaults to Mode D for direct invocations', () => {
    const message = renderer.render({ surface: 'Dashboard', sections: ['a', 'b'] });

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
    expect(contents.some((content) => content.includes('Developed by'))).toBe(true);
  });

  test('Mode M is a condensed PAGE — nothing is dropped', () => {
    // The old form kept the FIRST section and appended "+N more", which threw the content away. A
    // density loses resolution, never content.
    const message = renderer.render({
      surface: 'Modules',
      mode: 'M',
      sections: ['first', 'second', 'third'],
    });

    const contents = textContents(message);
    const body = contents.find((content) => content.includes('first'));
    expect(body).toContain('second');
    expect(body).toContain('third');
    expect(contents.some((content) => content.includes('Developed by'))).toBe(true);
  });

  test('Mode M keeps BLOCKS too, one compact line each', () => {
    // M used to read `sections` alone, which a block-built page leaves empty — so /health, /browse
    // and /modules collapsed to their surface name at M.
    const message = renderer.render({
      surface: 'Health',
      mode: 'M',
      blocks: [
        { kind: 'text', content: '**Operational**' },
        { kind: 'text', content: '**Discord API**\n-# Ping: 19ms' },
      ],
    });

    const body = textContents(message).find((content) => content.includes('Operational'));
    expect(body).toBeDefined();
    expect(body).toContain('Discord API');
    expect(body).toContain('Ping: 19ms');
  });

  test("Mode C is an OUTCOME — the module's own summary", () => {
    const message = renderer.render({
      surface: 'Health',
      mode: 'C',
      summary: 'all systems nominal',
    });

    const contents = textContents(message);
    expect(contents).toContain('all systems nominal');
    expect(contents.some((content) => content.includes('Developed by'))).toBe(true);
  });

  test('Mode C adds at most ONE detail line — a result, not a page', () => {
    const message = renderer.render({
      surface: 'Health',
      mode: 'C',
      summary: 'Operational',
      blocks: [
        { kind: 'text', content: '**Discord API**\n-# Ping: 19ms' },
        { kind: 'text', content: '**Cache**\n-# Connected' },
      ],
    });

    const body = textContents(message).find((content) => content.includes('Operational'));
    expect(body).toContain('Discord API');
    expect(body).not.toContain('Cache');
  });

  test('mode changes density, never the reported surface', () => {
    const d = textContents(renderer.render({ surface: 'Health', mode: 'D', summary: 'ok' }));
    const c = textContents(renderer.render({ surface: 'Health', mode: 'C', summary: 'ok' }));
    expect(d.some((content) => content.includes('Dumby Suite | Health'))).toBe(true);
    expect(c.some((content) => content.includes('Dumby Suite | Health'))).toBe(true);
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
    expect(frame(message).accent_color).toBe(0xffca6d);
    expect(contents.some((content) => content.startsWith('**Dumby Suite | Health**'))).toBe(true);
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
    expect(frame(message).accent_color).toBe(0xffca6d);
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
    // UR-20261012-032 — a rejected submission is an input fault, not a module fault.
    expect(
      renderer.noticeReasonFromError(
        Object.assign(new Error('x'), { name: 'InvalidCommandNameError' }),
      ),
    ).toBe('INVALID_INPUT');
    expect(renderer.noticeReasonFromError(new Error('boom'))).toBe('MODULE_ERROR');
  });
});

describe('an ephemeral has NO density modes (item 2)', () => {
  const renderer = new CoreRenderer();

  test('a card declaring mode M and ephemeral renders its content IN FULL', () => {
    // The module Info card declares its content in `sections` and renders at mode M, ephemeral. M
    // condensed each section to its first line, so the card lost everything but its title. The
    // grammar already says a private card has no densities — so the density is ignored, not obeyed.
    const block = [
      '**Hello World** · Standard',
      '-# A simple module',
      '',
      '**Developer**  Quixotic',
    ].join('\n');
    const message = renderer.render({
      surface: 'Hello World',
      mode: 'M',
      ephemeral: true,
      sections: [block],
    });

    const body = textContents(message).join('\n');
    expect(body).toContain('Hello World');
    expect(body).toContain('A simple module');
    expect(body).toContain('Developer');
  });

  test('a PUBLIC page at mode M still condenses', () => {
    const message = renderer.render({
      surface: 'Page',
      mode: 'M',
      sections: ['**one**\n-# detail', '**two**'],
    });
    const body = textContents(message).join('\n');
    expect(body).toContain('one');
    expect(body).toContain('two');
  });
});

// UR-20261026-098 — the read-only guard, and the single exception it now carries.
describe('UR-20261026-098 — createReadOnlyInteraction', () => {
  const surface = () => ({
    reply: async (): Promise<string> => 'reply',
    followUp: async (): Promise<string> => 'followUp',
    showModal: async (): Promise<string> => 'showModal',
    editReply: async (): Promise<string> => 'editReply',
  });

  test('blocks reply, followUp and showModal by default, and allows editReply', async () => {
    const guarded = new CoreRenderer().createReadOnlyInteraction(surface());
    await expect(guarded.reply()).rejects.toBeInstanceOf(DirectInteractionResponseError);
    await expect(guarded.followUp()).rejects.toBeInstanceOf(DirectInteractionResponseError);
    await expect(guarded.showModal()).rejects.toBeInstanceOf(DirectInteractionResponseError);
    await expect(guarded.editReply()).resolves.toBe('editReply');
  });

  test('allows followUp only for a handler that opts in — reply and showModal stay shut', async () => {
    const guarded = new CoreRenderer().createReadOnlyInteraction(surface(), {
      allowFollowUp: true,
    });
    await expect(guarded.followUp()).resolves.toBe('followUp');
    await expect(guarded.reply()).rejects.toBeInstanceOf(DirectInteractionResponseError);
    await expect(guarded.showModal()).rejects.toBeInstanceOf(DirectInteractionResponseError);
    await expect(guarded.editReply()).resolves.toBe('editReply');
  });
});

// UR-20261031-119 — a malformed banner url must not take the message down with it.
//
// The live failure: `https://${publicDomain}/modules/dashboard/assets/banner.png` with an empty
// publicDomain is `https:///modules/...`, Discord answers 50035 URL_TYPE_INVALID_URL, and it rejects
// the WHOLE message — a member saw "Module error" for /dashboard on both profiles.
describe('a banner url Discord would reject', () => {
  const build = (bannerUrl: string | undefined) =>
    new CoreRenderer({
      logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as never,
      ...(bannerUrl !== undefined ? { bannerUrl } : {}),
    });

  test('is dropped, and the frame still renders', () => {
    const renderer = build('https:///modules/dashboard/assets/banner.png');
    const message = renderer.render({ surface: 'Health', mode: 'D', summary: 'ok' });
    // The page renders; only the banner slot is absent.
    expect(JSON.stringify(message)).not.toContain('https:///modules');
  });

  test('a well formed url is still rendered', () => {
    const renderer = build('https://example.test/assets/banner.png');
    const message = renderer.render({ surface: 'Health', mode: 'D', summary: 'ok' });
    expect(JSON.stringify(message)).toContain('https://example.test/assets/banner.png');
  });
});
