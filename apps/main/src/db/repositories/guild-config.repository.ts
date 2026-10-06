import type { Knex } from 'knex';
import { guildConfigSchema, type GuildConfig } from '../../config/guild-config.schema.js';

/**
 * §23.3 + the audit-register roadmap note — every access to `guild_configs` flows through this
 * single owned abstraction, so the cache-invalidation and schema-evolution guarantees hold.
 */
export interface GuildConfigStore {
  findByGuildId(guildId: string): Promise<GuildConfig | undefined>;
  upsert(guildId: string, settings: GuildConfig): Promise<void>;
}

interface GuildConfigRow {
  guildId: string;
  settings?: unknown;
}

export class PostgresGuildConfigStore implements GuildConfigStore {
  constructor(private readonly knex: Knex) {}

  async findByGuildId(guildId: string): Promise<GuildConfig | undefined> {
    const row = await this.knex<GuildConfigRow>('guild_configs').where({ guildId }).first();
    if (!row) return undefined;
    const raw = typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings ?? {});
    const parsed = guildConfigSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  }

  async upsert(guildId: string, settings: GuildConfig): Promise<void> {
    const serialized = JSON.stringify(settings);
    await this.knex('guild_configs')
      .insert({ guildId, settings: serialized, updatedAt: new Date() })
      .onConflict('guildId')
      .merge({ settings: serialized, updatedAt: new Date() });
  }
}
