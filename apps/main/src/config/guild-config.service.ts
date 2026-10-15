import type { GuildConfigStore } from '../db/repositories/guild-config.repository.js';
import { guildConfigSchema, type GuildConfig } from './guild-config.schema.js';
import type { CacheManager } from '../cache/cache-manager.js';
import type { Logger } from '../logging/logger.js';

export type { GuildConfig };

const DEFAULT_CONFIG: GuildConfig = {
  locale: 'en-US',
  timezone: 'UTC',
  premiumEnabled: false,
};

const CONFIG_CACHE_KEY_PREFIX = 'guild:config:';
const CONFIG_CACHE_TTL = 120_000;

/**
 * §23.3 — per-guild configuration. Reads/writes flow through the `GuildConfigStore` repository
 * (never raw Knex), and every value is validated against `guildConfigSchema`.
 */
export class GuildConfigService {
  /**
   * UR-20261012-072 — told when a MODULE's per-guild config is written, so the module's
   * `onConfigChange` hook can run (§11.7: "react to a per-guild config change without a reload").
   * Injected by bootstrap, because a config service must not know the module registry.
   */
  private onModuleConfigChanged:
    | ((moduleSlug: string, guildId: string, config: Readonly<Record<string, unknown>>) => void)
    | undefined;

  setModuleConfigChangeNotifier(
    notify: (
      moduleSlug: string,
      guildId: string,
      config: Readonly<Record<string, unknown>>,
    ) => void,
  ): void {
    this.onModuleConfigChanged = notify;
  }

  constructor(
    private readonly store: GuildConfigStore,
    private readonly cache: CacheManager,
    private readonly logger: Logger,
  ) {}

  async get(guildId: string): Promise<GuildConfig> {
    return this.cache.get<GuildConfig>(
      `${CONFIG_CACHE_KEY_PREFIX}${guildId}`,
      async () => {
        const stored = await this.store.findByGuildId(guildId);
        return { ...DEFAULT_CONFIG, ...(stored ?? {}) };
      },
      { ttlMs: CONFIG_CACHE_TTL },
    ) as Promise<GuildConfig>;
  }

  async set(guildId: string, config: Partial<GuildConfig>): Promise<void> {
    const existing = await this.get(guildId);
    const merged = guildConfigSchema.parse({ ...existing, ...config });
    await this.store.upsert(guildId, merged);
    await this.cache.invalidate(`${CONFIG_CACHE_KEY_PREFIX}${guildId}`);
    this.logger.info('guild-config-updated', { guildId, keys: Object.keys(config) });
  }

  async getModuleConfig(guildId: string, moduleSlug: string): Promise<Record<string, unknown>> {
    const config = await this.get(guildId);
    return (config[moduleSlug] as Record<string, unknown>) ?? {};
  }

  async setModuleConfig(
    guildId: string,
    moduleSlug: string,
    moduleConfig: Record<string, unknown>,
  ): Promise<void> {
    await this.set(guildId, { [moduleSlug]: moduleConfig });
    // §11.7 — the module is told, so it can refresh cached values rather than recompute on every read.
    this.onModuleConfigChanged?.(moduleSlug, guildId, moduleConfig);
  }
}
