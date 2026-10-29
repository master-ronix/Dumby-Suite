import { describe, expect, test, vi } from 'vitest';
import { ensureDefaultModuleEmoji } from '../../src/rendering/module-emoji-upload.js';
import { customEmojiRef, resetModuleEmojis } from '../../src/rendering/module-icons.js';
import type { Logger } from '../../src/logging/logger.js';
import { join } from 'node:path';

const makeLogger = (): Logger =>
  ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) as unknown as Logger;

/** A client whose application owns no emojis yet, so every asset is created. */
function fakeClient(): unknown {
  return {
    application: {
      emojis: {
        fetch: async (): Promise<unknown[]> => [],
        create: async ({ name }: { name: string }): Promise<{ id: string; name: string }> => ({
          id: '555',
          name,
        }),
      },
    },
  };
}

describe('the emoji upload and the render must use the SAME application key', () => {
  test('registers under the GIVEN application id, so that application can resolve it', async () => {
    // UR-20261012-062 — the regression this pins: the main bot registered under the DEFAULT scope
    // (empty string) while the render looked up by its real application id, so registration and lookup
    // used different keys and the main bot missed EVERY icon. A persona passed its own id on both
    // sides, which is why the icons were alive there and gone on the main bot.
    resetModuleEmojis();
    await ensureDefaultModuleEmoji(fakeClient() as never, makeLogger(), 'app-9');

    expect(customEmojiRef('dumby_info', 'app-9')).toContain('555');
    // And another application must NOT borrow them.
    expect(customEmojiRef('dumby_info', 'some-other-app')).toBeUndefined();
    resetModuleEmojis();
  });
});

describe('a module supplies its OWN logo (UR-20261012-066)', () => {
  test('registers a module-declared icon from the path the caller resolved', async () => {
    // The module names the emoji (ui.icon) and points at its image (ui.iconAsset, relative to its
    // root). The core resolves the pair and holds no copy of either -- ADR-012's pattern, applied to
    // the logo. The framework chrome list is unchanged and still uploads.
    resetModuleEmojis();
    await ensureDefaultModuleEmoji(fakeClient() as never, makeLogger(), 'app-9', [
      // The REAL asset the module now owns -- proving the declared path resolves, not a stand-in.
      {
        name: 'dumby_browse',
        path: join(
          process.cwd(),
          '..',
          '..',
          'packages',
          'modules',
          'browse',
          'assets',
          'icon.png',
        ),
      },
    ]);

    expect(customEmojiRef('dumby_browse', 'app-9')).toContain('555');
    // The framework chrome still registers from the core's own list — and a MODULE indicator is
    // no longer in it: `dumby_status_online` moved to the persona module (UR-20261029-112).
    expect(customEmojiRef('dumby_info', 'app-9')).toContain('555');
    expect(customEmojiRef('dumby_status_online', 'app-9')).toBeUndefined();
    // And another application still borrows nothing.
    expect(customEmojiRef('dumby_browse', 'other-app')).toBeUndefined();
    resetModuleEmojis();
  });
});
