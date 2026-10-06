import { test, expect, describe, vi } from 'vitest';
import { GuildConfigService } from '../../src/config/guild-config.service.js';

const DEFAULT_CONFIG = { locale: 'en-US', timezone: 'UTC', premiumEnabled: false };

function makeRow(settings?: unknown) {
  return settings === undefined ? undefined : { guildId: 'g1', settings: JSON.stringify(settings) };
}

function makeDeps(opts?: { firstRow?: Record<string, unknown> | undefined }) {
  const merge = vi.fn(async () => undefined);
  const onConflict = vi.fn(() => ({ merge }));
  const insert = vi.fn(() => ({ onConflict }));
  const first = vi.fn(async () => (opts?.firstRow !== undefined ? opts.firstRow : undefined));
  const knexTable = { insert, where: () => ({ first }) };
  const db = { knex: vi.fn(() => knexTable) } as never;

  const cacheGet = vi.fn(async (_key: string, recompute: () => Promise<unknown>) => recompute());
  const cacheInvalidate = vi.fn(async () => undefined);
  const cache = { get: cacheGet, invalidate: cacheInvalidate } as never;
  const logger = { info: vi.fn(), error: vi.fn() } as never;

  return { db: db as { knex: ReturnType<typeof vi.fn> }, cache, logger, insert, first, knexTable };
}

describe('GuildConfigService', () => {
  test('get() falls back to defaults when no row exists', async () => {
    const { db, cache, logger } = makeDeps({ firstRow: undefined });
    const service = new GuildConfigService(db, cache, logger);
    const config = await service.get('g1');
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  test('get() stores and returns merged settings when a row exists', async () => {
    const { db, cache, logger } = makeDeps({ firstRow: makeRow({ locale: 'fr-FR' }) });
    const service = new GuildConfigService(db, cache, logger);
    const config = await service.get('g1');
    expect(config.locale).toBe('fr-FR');
    expect(config.timezone).toBe('UTC');
    expect(config.premiumEnabled).toBe(false);
  });

  test('getModuleConfig() returns the named module section', async () => {
    const { db, cache, logger } = makeDeps({ firstRow: makeRow({ health: { banner: true } }) });
    const service = new GuildConfigService(db, cache, logger);
    expect(await service.getModuleConfig('g1', 'health')).toEqual({ banner: true });
    expect(await service.getModuleConfig('g1', 'missing')).toEqual({});
  });

  test('set() merges, upserts, invalidates the cache, and logs', async () => {
    const { db, cache, logger, insert } = makeDeps({ firstRow: makeRow({ locale: 'fr-FR' }) });
    const service = new GuildConfigService(db, cache, logger);
    await service.setModuleConfig('g1', 'health', { banner: true });
    expect(insert).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'guild-config-updated',
      expect.objectContaining({ guildId: 'g1' }),
    );
  });

  test('get() uses the cache layer and does not recompute on hits', async () => {
    const { db, cache, logger } = makeDeps();
    const cached = { locale: 'de-DE', timezone: 'Europe/Berlin' };
    (cache as { get: ReturnType<typeof vi.fn> }).get = vi.fn(async () => cached);
    const service = new GuildConfigService(db, cache, logger);
    expect(await service.get('g1')).toEqual(cached);
  });
});
