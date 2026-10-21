import { test, expect, vi, describe } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Client } from 'discord.js';
import type { Logger } from '../../src/logging/logger.js';
import {
  COMMAND_MARKER_ICON_NAME,
  RETIRED_MODULE_FALLBACK_ICON_NAME,
  commandMarkerIcon,
  moduleIcon,
  registerModuleEmoji,
} from '../../src/rendering/module-icons.js';
import { ensureDefaultModuleEmoji } from '../../src/rendering/module-emoji-upload.js';

/**
 * The module marker was two assets — a "command decoration" (`dumby_module`) and a separate "fallback
 * logo" (`dumby_module_fallback`) — documented as never interchangeable. They render the same motif,
 * so the second is retired and ONE marker now serves both roles, on the main bot and on every persona.
 *
 * These cases pin the consolidation: the logo fallback resolves to the surviving marker, and an
 * already-registered `dumby_module_fallback` is deleted rather than left sitting beside the set.
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

function makeClient(existing: { id: string; name: string }[]) {
  const created: string[] = [];
  const deleted: string[] = [];
  let nextId = 9000;
  const client = {
    application: {
      emojis: {
        fetch: async () => existing,
        create: async ({ name }: { attachment: Buffer; name: string }) => {
          created.push(name);
          return { id: String(nextId++), name };
        },
        delete: async (id: string) => {
          deleted.push(id);
        },
      },
    },
  };
  return { client: client as unknown as Client, created, deleted };
}

function assetFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'module-marker-'));
  const path = join(dir, 'logo.png');
  writeFileSync(path, contents);
  return path;
}

const APP = 'app-9';

describe('the module marker is consolidated onto one emoji', () => {
  test('a module with no declared icon falls back to the SURVIVING marker, not the retired one', () => {
    // Only the surviving marker is registered for this application.
    registerModuleEmoji('dumby_module', '777', APP);
    registerModuleEmoji(RETIRED_MODULE_FALLBACK_ICON_NAME, '888', APP);

    // It must resolve to `dumby_module` — the retired name is never consulted.
    expect(moduleIcon(undefined, APP)).toBe('<:dumby_module:777>');
  });

  test('a module whose declared icon did not resolve also lands on the surviving marker', () => {
    registerModuleEmoji('dumby_module', '777', APP);
    // `browse` is a bare custom-emoji NAME that is not registered for this application.
    expect(moduleIcon('browse', APP)).toBe('<:dumby_module:777>');
  });

  test('the retired emoji is DELETED at boot and never re-uploaded', async () => {
    const logger = makeLogger();
    const { client, created, deleted } = makeClient([
      { id: '555', name: RETIRED_MODULE_FALLBACK_ICON_NAME },
    ]);

    await ensureDefaultModuleEmoji(client, logger, APP, [
      { name: 'dumby_x', path: assetFile('x') },
    ]);

    // Removed from the application…
    expect(deleted).toStrictEqual(['555']);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        `module-emoji-retired app=${APP} name=${RETIRED_MODULE_FALLBACK_ICON_NAME}`,
      ),
    );
    // …and not put back: the upload set no longer contains it.
    expect(created).not.toContain(RETIRED_MODULE_FALLBACK_ICON_NAME);
  });

  test('the command marker is dumby_modules, NOT the cube named dumby_module', () => {
    registerModuleEmoji(COMMAND_MARKER_ICON_NAME, '333', APP);
    registerModuleEmoji('dumby_module', '444', APP);

    // The squared marker beside each command is the modules module's grid…
    expect(commandMarkerIcon(APP)).toBe('<:dumby_modules:333>');
    // …and the one-letter-apart cube is never what the command list renders.
    expect(commandMarkerIcon(APP)).not.toContain('dumby_module:');
  });

  test('dumby_dashboard is retired too — the dashboard declares the shared home emoji', async () => {
    const logger = makeLogger();
    const { client, created, deleted } = makeClient([{ id: '666', name: 'dumby_dashboard' }]);

    await ensureDefaultModuleEmoji(client, logger, APP, []);

    expect(deleted).toStrictEqual(['666']);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('module-emoji-retired app=' + APP + ' name=dumby_dashboard'),
    );
    expect(created).not.toContain('dumby_dashboard');
  });

  test('retirement is idempotent — an absent name is a no-op, not an error', async () => {
    const logger = makeLogger();
    const { client, deleted } = makeClient([]);

    await ensureDefaultModuleEmoji(client, logger, APP, []);

    expect(deleted).toStrictEqual([]);
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('module-emoji-retire-failed'),
    );
  });
});
