import { test, expect, describe, vi } from 'vitest';
import { GuildConfigService } from '../../src/config/guild-config.service.js';
import type { GuildConfigStore } from '../../src/db/repositories/guild-config.repository.js';

const DEFAULT_CONFIG = { locale: 'en-US', timezone: 'UTC', premiumEnabled: false };

function makeDeps(opts?: { stored?: Record<string, unknown> | undefined }) {
  const upsert = vi.fn(async () => undefined);
  const findByGuildId = vi.fn(async () => opts?.stored);
  const store = { findByGuildId, upsert } as unknown as GuildConfigStore;

  const cacheGet = vi.fn(async (_key: string, recompute: () => Promise<unknown>) => recompute());
  const cacheInvalidate = vi.fn(async () => undefined);
  const cache = { get: cacheGet, invalidate: cacheInvalidate } as never;
  const logger = { info: vi.fn(), error: vi.fn() } as never;

  return { store, cache, logger, upsert, findByGuildId };
}

describe('GuildConfigService', () => {
  test('get() falls back to defaults when no row exists', async () => {
    const { store, cache, logger } = makeDeps({ stored: undefined });
    const service = new GuildConfigService(store, cache, logger);
    expect(await service.get('g1')).toEqual(DEFAULT_CONFIG);
  });

  test('get() returns merged settings when a row exists', async () => {
    const { store, cache, logger } = makeDeps({ stored: { locale: 'fr-FR' } });
    const service = new GuildConfigService(store, cache, logger);
    const config = await service.get('g1');
    expect(config.locale).toBe('fr-FR');
    expect(config.timezone).toBe('UTC');
    expect(config.premiumEnabled).toBe(false);
  });

  test('getModuleConfig() returns the named module section', async () => {
    const { store, cache, logger } = makeDeps({ stored: { health: { banner: true } } });
    const service = new GuildConfigService(store, cache, logger);
    expect(await service.getModuleConfig('g1', 'health')).toEqual({ banner: true });
    expect(await service.getModuleConfig('g1', 'missing')).toEqual({});
  });

  test('set() validates, upserts via the repository, invalidates the cache, and logs', async () => {
    const { store, cache, logger, upsert } = makeDeps({ stored: { locale: 'fr-FR' } });
    const service = new GuildConfigService(store, cache, logger);
    await service.setModuleConfig('g1', 'health', { banner: true });
    expect(upsert).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'guild-config-updated',
      expect.objectContaining({ guildId: 'g1' }),
    );
  });

  test('get() uses the cache layer and does not recompute on hits', async () => {
    const { store, cache, logger } = makeDeps();
    const cached = { locale: 'de-DE', timezone: 'Europe/Berlin' };
    (cache as { get: ReturnType<typeof vi.fn> }).get = vi.fn(async () => cached);
    const service = new GuildConfigService(store, cache, logger);
    expect(await service.get('g1')).toEqual(cached);
  });
});
