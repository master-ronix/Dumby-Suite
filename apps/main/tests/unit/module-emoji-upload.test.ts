import { describe, expect, test, vi } from 'vitest';
import { ensureDefaultModuleEmoji } from '../../src/rendering/module-emoji-upload.js';
import { customEmojiRef, resetModuleEmojis } from '../../src/rendering/module-icons.js';
import type { Logger } from '../../src/logging/logger.js';

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

    expect(customEmojiRef('dumby_status_online', 'app-9')).toContain('555');
    // And another application must NOT borrow them.
    expect(customEmojiRef('dumby_status_online', 'some-other-app')).toBeUndefined();
    resetModuleEmojis();
  });
});
