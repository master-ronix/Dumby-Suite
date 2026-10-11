import { describe, expect, test, vi } from 'vitest';
import {
  button,
  section,
  stringSelect,
  textInputModal,
} from '../../src/shared/utils/components-v2.js';
import { CoreRenderer } from '../../src/rendering/core-renderer.js';
import { InteractionRegistry } from '../../src/interactions/interaction-registry.js';
import { registerCoreFrameHandlers } from '../../src/interactions/core-frame.handlers.js';

type Any = Record<string, unknown>;

describe('components v2 — Section, modal & select', () => {
  test('section wraps text beside an accessory button', () => {
    const s = section('hello', button('c', 'Info', 2, false)) as unknown as Any;
    expect(s['type']).toBe(9);
    expect((s['components'] as Any[])[0]?.['type']).toBe(10);
    expect((s['accessory'] as Any)['type']).toBe(2);
  });

  test('textInputModal builds a text-input modal', () => {
    const m = textInputModal('cid', 'Title', {
      customId: 'q',
      label: 'L',
      required: true,
      maxLength: 5,
    }) as unknown as Any;
    expect(m['custom_id']).toBe('cid');
    const inner = (m['components'] as Any[])[0]?.['components'] as Any[];
    expect(inner[0]?.['type']).toBe(4);
    expect(inner[0]?.['max_length']).toBe(5);
  });

  test('stringSelect accepts a custom-emoji object and a plain string', () => {
    const withObj = stringSelect(
      'cid',
      [{ label: 'a', value: 'a', emoji: { name: 'x', id: '1' } }],
      'pick',
    ) as unknown as Any;
    expect((withObj['options'] as Any[])[0]?.['emoji']).toEqual({ name: 'x', id: '1' });
    const withStr = stringSelect('cid', [
      { label: 'b', value: 'b', emoji: '⬜' },
    ]) as unknown as Any;
    expect((withStr['options'] as Any[])[0]?.['emoji']).toEqual({ name: '⬜' });
  });

  test('button omits the label when icon-only and keeps a custom emoji', () => {
    const b = button('c', '', 2, false, { name: 'home', id: '9' }) as unknown as Any;
    expect(b['label']).toBeUndefined();
    expect(b['emoji']).toEqual({ name: 'home', id: '9' });
  });
});

describe('renderer — content blocks', () => {
  const inner = (msg: { components: unknown[] }): Any[] =>
    (msg.components[0] as Any)['components'] as Any[];

  test('renders text, inline sections and a select inside the container', () => {
    const r = new CoreRenderer();
    const msg = r.render({
      surface: 'Marketplace',
      moduleId: 'browse',
      blocks: [
        { kind: 'text', content: 'hello' },
        { kind: 'section', content: 'mod', accessory: { customId: 'c', label: 'Info', style: 2 } },
        {
          kind: 'row',
          buttons: [
            { customId: 'b1', label: 'Discover', style: 2 },
            { customId: 'b2', label: '', style: 2, emoji: { name: 'home', id: '1' } },
          ],
        },
        {
          kind: 'select',
          customId: 's',
          placeholder: 'pick',
          disabled: true,
          options: [{ label: 'a', value: 'a', description: 'd', emoji: '⬜' }],
        },
      ],
    });
    const list = inner(msg as unknown as { components: unknown[] });
    expect(list[0]?.['type']).toBe(10);
    expect(list.some((c) => c['type'] === 9)).toBe(true);
    expect(list.some((c) => c['type'] === 1)).toBe(true);
  });
});

describe('interaction registry — acknowledge modes', () => {
  const mkInteraction = (customId: string): Any & Record<string, ReturnType<typeof vi.fn>> => ({
    id: 'i1',
    customId,
    user: { id: 'u' },
    guildId: 'g',
    reply: vi.fn(async () => {}),
    deferReply: vi.fn(async () => {}),
    editReply: vi.fn(async () => {}),
    deferUpdate: vi.fn(async () => {}),
    showModal: vi.fn(async () => {}),
  });

  test("ack 'none' skips acknowledgement (the handler opens a modal)", async () => {
    const ack = vi.fn(async () => {});
    const reg = new InteractionRegistry({ acknowledge: ack });
    const run = vi.fn(async () => {});
    reg.register({ customIdPrefix: 'x:', ack: 'none', parse: () => ({}), execute: run });
    const i = mkInteraction('x:y:u:z');
    await reg.dispatch(i as never);
    expect(ack).not.toHaveBeenCalled();
    expect(i.deferUpdate).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  test("ack 'ephemeral' defers a private reply", async () => {
    const reg = new InteractionRegistry({ acknowledge: vi.fn(async () => {}) });
    reg.register({
      customIdPrefix: 'y:',
      ack: 'ephemeral',
      parse: () => ({}),
      execute: async () => {},
    });
    const i = mkInteraction('y:y:u:z');
    await reg.dispatch(i as never);
    expect(i.deferReply).toHaveBeenCalledWith({ ephemeral: true });
  });

  test("ack 'update' (default) uses the acknowledge callback", async () => {
    const ack = vi.fn(async () => {});
    const reg = new InteractionRegistry({ acknowledge: ack });
    reg.register({ customIdPrefix: 'z:', parse: () => ({}), execute: async () => {} });
    await reg.dispatch(mkInteraction('z:y:u:z') as never);
    expect(ack).toHaveBeenCalled();
  });
});

describe('core-frame handlers — discover / info / install', () => {
  test('discover opens a modal, info replies, install routes', async () => {
    const handlers: Array<{
      customIdPrefix: string;
      parse: (c: string) => unknown;
      execute: (i: unknown, c: unknown) => Promise<void>;
    }> = [];
    const dispatched: string[] = [];
    const registry = { register: (h: (typeof handlers)[number]) => handlers.push(h) };
    const router = {
      dispatch: async (i: { commandName: string }) => {
        dispatched.push(i.commandName);
      },
    };
    const installed: string[] = [];
    registerCoreFrameHandlers({
      registry: registry as never,
      router: router as never,
      moduleInfo: (id) => ({ info: id }),
      installModule: async (id) => {
        installed.push(id);
      },
    });
    const find = (p: string) => handlers.find((h) => h.customIdPrefix === p);

    const discover = find('dumby:discover:');
    const showModal = vi.fn(async () => {});
    await discover?.execute(
      { user: { id: 'u' }, showModal },
      discover.parse('dumby:discover:u:browse'),
    );
    expect(showModal).toHaveBeenCalled();

    const info = find('dumby:info:');
    const editReply = vi.fn(async () => {});
    await info?.execute({ user: { id: 'u' }, editReply }, info.parse('dumby:info:u:hello-world'));
    expect(editReply).toHaveBeenCalled();

    const act = find('dumby:act:');
    await act?.execute(
      { user: { id: 'u' }, guildId: 'g', values: ['hello-world'] },
      act.parse('dumby:act:u:install:browse'),
    );
    expect(installed).toEqual(['hello-world']);
    expect(dispatched).toContain('browse');
  });
});
