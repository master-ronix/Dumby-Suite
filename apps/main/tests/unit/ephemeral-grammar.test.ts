import { test, expect, describe } from 'vitest';
import { CoreRenderer } from '../../src/rendering/core-renderer.js';
import { ComponentType } from '../../src/shared/utils/components-v2.js';

/**
 * §1.2 / item 4-5 — the EPHEMERAL grammar.
 *
 * An ephemeral (private) card has its own rules: ONE container, and "NO accent / colour is enforced —
 * the container carries no `accent_color`", no banner, no identity band, no footer.
 *
 * The rule was documented and honoured by `renderEphemeral` — but `render()` applied an accent to
 * every container it built, including when it was told the render was ephemeral. That is the reported
 * bypass: /modules' private Info card came back amber on a persona, so a private card announced a
 * profile it did not belong to.
 */
const containerOf = (message: { components: unknown[] }) =>
  message.components[0] as { type: number; accent_color?: number; components: unknown[] };

describe('the ephemeral grammar', () => {
  const renderer = new CoreRenderer();

  test('an ephemeral render carries NO accent, even with a profile that has one', () => {
    const message = renderer.render({
      surface: 'Module',
      displayName: 'Dumby Suite | Modules',
      moduleId: 'hello-world',
      ephemeral: true,
      profile: { kind: 'persona', id: 'p1', accent: '#FF00AA' },
      sections: ['A private detail card.'],
    });
    const container = containerOf(message);
    expect(container.type).toBe(ComponentType.CONTAINER);
    expect(container.accent_color).toBeUndefined();
  });

  test('the SAME render without ephemeral DOES carry the profile accent', () => {
    const message = renderer.render({
      surface: 'Module',
      displayName: 'Dumby Suite | Modules',
      moduleId: 'hello-world',
      profile: { kind: 'persona', id: 'p1', accent: '#FF00AA' },
      sections: ['A page.'],
    });
    expect(containerOf(message).accent_color).toBe(0xff00aa);
  });

  test('an ephemeral render carries no footer — it is a card, not a page', () => {
    const message = renderer.render({
      surface: 'Module',
      displayName: 'Dumby Suite | Modules',
      moduleId: 'hello-world',
      ephemeral: true,
      sections: ['A private detail card.'],
    });
    const inner = containerOf(message).components as Array<{ content?: string }>;
    const text = inner.map((c) => c.content ?? '').join('\n');
    // The module footer is `<name> [<id>]`.
    expect(text).not.toContain('[hello-world]');
  });

  test('renderEphemeralBlocks stays accent-free', () => {
    const message = renderer.renderEphemeralBlocks([{ kind: 'text', content: 'private' }]);
    expect(containerOf(message).accent_color).toBeUndefined();
  });
});
