import { test, expect, vi, describe } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Client } from 'discord.js';
import type { Logger } from '../../src/logging/logger.js';
import { ensureDefaultModuleEmoji } from '../../src/rendering/module-emoji-upload.js';
import type { EmojiArtworkLedger } from '../../src/rendering/emoji-artwork-ledger.js';

/**
 * UR-20261012-057 — an application emoji is matched BY NAME and reused, so its artwork is frozen at
 * first creation. Discord never lets us read an emoji's image back, so without a record of what was
 * uploaded there is no way to tell a current emoji from a stale one. That is how the main bot and a
 * persona ended up holding the same eighteen names with DIFFERENT artwork: the assets were redesigned
 * after the main bot's emojis were created, and the persona's were created afterwards.
 *
 * These cases pin the reconciliation: reuse only when the recorded hash matches the asset on disk.
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

function makeLedger(entries: Record<string, string> = {}) {
  const recorded: Record<string, string> = { ...entries };
  const ledger: EmojiArtworkLedger = {
    get: (app, name) => recorded[`${app}:${name}`],
    record: (app, name, hash) => {
      recorded[`${app}:${name}`] = hash;
    },
    get recordedCount() {
      return Object.keys(recorded).length;
    },
    save: async () => {},
  };
  return { ledger, recorded };
}

function makeClient(existing: { id: string; name: string }[]) {
  const created: { id: string; name: string }[] = [];
  const deleted: string[] = [];
  let nextId = 1000;
  const client = {
    application: {
      emojis: {
        fetch: async () => existing,
        create: async ({ name }: { attachment: Buffer; name: string }) => {
          const emoji = { id: String(nextId++), name };
          created.push(emoji);
          return emoji;
        },
        delete: async (id: string) => {
          deleted.push(id);
        },
      },
    },
  };
  return { client: client as unknown as Client, created, deleted };
}

/** A module asset on disk, at the absolute path the uploader expects. */
function assetFile(contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'emoji-asset-'));
  const path = join(dir, 'logo.png');
  writeFileSync(path, contents);
  return path;
}

const APP = '1456789012345678901';

describe('module emoji artwork reconciliation', () => {
  test('creates the emoji and records its asset hash when none exists', async () => {
    const { ledger, recorded } = makeLedger();
    const { client, created, deleted } = makeClient([]);
    const path = assetFile('artwork-v1');

    await ensureDefaultModuleEmoji(client, makeLogger(), APP, [{ name: 'dumby_x', path }], ledger);

    // The framework's own icon set is processed too, so assertions are scoped to the name under test.
    expect(created.filter((e) => e.name === 'dumby_x')).toHaveLength(1);
    expect(deleted).toStrictEqual([]);
    expect(recorded[`${APP}:dumby_x`]).toBe(
      createHash('sha256').update('artwork-v1').digest('hex'),
    );
  });

  test('REUSES the emoji when the recorded hash still matches the asset', async () => {
    const path = assetFile('artwork-v1');
    const hash = createHash('sha256').update('artwork-v1').digest('hex');
    const { ledger } = makeLedger({ [`${APP}:dumby_x`]: hash });
    const { client, created, deleted } = makeClient([{ id: '555', name: 'dumby_x' }]);

    await ensureDefaultModuleEmoji(client, makeLogger(), APP, [{ name: 'dumby_x', path }], ledger);

    expect(created.filter((e) => e.name === 'dumby_x')).toHaveLength(0);
    expect(deleted).toStrictEqual([]);
  });

  test('REPLACES the emoji when the asset changed — the drift that caused the mismatch', async () => {
    const path = assetFile('artwork-v2');
    const staleHash = createHash('sha256').update('artwork-v1').digest('hex');
    const { ledger, recorded } = makeLedger({ [`${APP}:dumby_x`]: staleHash });
    const { client, created, deleted } = makeClient([{ id: '555', name: 'dumby_x' }]);

    await ensureDefaultModuleEmoji(client, makeLogger(), APP, [{ name: 'dumby_x', path }], ledger);

    expect(deleted).toStrictEqual(['555']);
    expect(created.filter((e) => e.name === 'dumby_x')).toHaveLength(1);
    expect(recorded[`${APP}:dumby_x`]).toBe(
      createHash('sha256').update('artwork-v2').digest('hex'),
    );
  });

  test('REPLACES an emoji with NO recorded hash — its artwork cannot be shown to match', async () => {
    // This is the existing production case: the main bot's emojis predate the ledger entirely.
    const path = assetFile('artwork-v2');
    const { ledger } = makeLedger();
    const { client, created, deleted } = makeClient([{ id: '555', name: 'dumby_x' }]);

    await ensureDefaultModuleEmoji(client, makeLogger(), APP, [{ name: 'dumby_x', path }], ledger);

    expect(deleted).toStrictEqual(['555']);
    expect(created.filter((e) => e.name === 'dumby_x')).toHaveLength(1);
  });

  test('without a ledger it still reuses by name — the old behaviour, unchanged', async () => {
    const path = assetFile('artwork-v2');
    const { client, created, deleted } = makeClient([{ id: '555', name: 'dumby_x' }]);

    await ensureDefaultModuleEmoji(client, makeLogger(), APP, [{ name: 'dumby_x', path }]);

    expect(created.filter((e) => e.name === 'dumby_x')).toHaveLength(0);
    expect(deleted).toStrictEqual([]);
  });
});
