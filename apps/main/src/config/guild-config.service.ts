import type { DbClient } from '../db/client.js';
import { tryParseJson } from '../shared/utils/index.js';
import type { CacheManager } from '../cache/cache-manager.js';
import type { Logger } from '../logging/logger.js';

export interface GuildConfig {
  locale?: string;
  timezone?: string;
  prefix?: string;
  moderation?: {
    logChannelId?: string;
    muteRoleId?: string;
  };
  channelRestrictions?: Record<string, { type: 'allow' | 'deny'; channelIds: string[] }>;
  premiumEnabled?: boolean;
  [moduleKey: string]: unknown;
}

const DEFAULT_CONFIG: GuildConfig = {
  locale: 'en-US',
  timezone: 'UTC',
  premiumEnabled: false,
};

const CONFIG_CACHE_KEY_PREFIX = 'guild:config:';
const CONFIG_CACHE_TTL = 120_000;

export class GuildConfigService {
  constructor(
    private readonly db: DbClient,
    private readonly cache: CacheManager,
    private readonly logger: Logger,
  ) {}

  async get(guildId: string): Promise<GuildConfig> {
    return this.cache.get<GuildConfig>(
      `${CONFIG_CACHE_KEY_PREFIX}${guildId}`,
      async () => {
        const row = await this.db.knex('guild_configs').where({ guildId }).first<{
          settings?: string;
        }>();
        if (row?.settings) {
          const parsed = tryParseJson<Record<string, unknown>>(row.settings);
          return { ...DEFAULT_CONFIG, ...(parsed ?? {}) };
        }
        return { ...DEFAULT_CONFIG };
      },
      { ttlMs: CONFIG_CACHE_TTL },
    ) as Promise<GuildConfig>;
  }

  async set(guildId: string, config: Partial<GuildConfig>): Promise<void> {
    const existing = await this.get(guildId);
    const merged = { ...existing, ...config };
    await this.db
      .knex('guild_configs')
      .insert({ guildId, settings: JSON.stringify(merged), updatedAt: new Date() })
      .onConflict('guildId')
      .merge({ settings: JSON.stringify(merged), updatedAt: new Date() });

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
  }
}
