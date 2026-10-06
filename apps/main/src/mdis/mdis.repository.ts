import type { Knex } from 'knex';
import type { ModuleInstallStore } from './mdis.service.js';

/** The runtime `guild_module_states`-backed install store for the MDIS surface. */
export class PostgresModuleInstallStore implements ModuleInstallStore {
  constructor(private readonly knex: Knex) {}

  async listActive(guildId: string): Promise<string[]> {
    const rows = await this.knex('guild_module_states')
      .select<{ moduleSlug: string }[]>('moduleSlug')
      .where({ guildId, enabled: true, state: 'active' })
      .whereNull('deletedAt');
    return rows.map((row) => row.moduleSlug);
  }

  async install(guildId: string, slug: string): Promise<void> {
    const existing = await this.knex('guild_module_states')
      .select<{ id: string }>('id')
      .where({ guildId, moduleSlug: slug })
      .whereNull('deletedAt')
      .first();
    if (existing !== undefined) {
      await this.knex('guild_module_states')
        .where({ id: existing.id })
        .update({ enabled: true, state: 'active', updatedAt: new Date() });
      return;
    }
    await this.knex('guild_module_states').insert({
      guildId,
      moduleSlug: slug,
      enabled: true,
      state: 'active',
      updatedAt: new Date(),
    });
  }

  async uninstall(guildId: string, slug: string): Promise<void> {
    await this.knex('guild_module_states')
      .where({ guildId, moduleSlug: slug })
      .update({ enabled: false, state: 'disabled', updatedAt: new Date() });
  }
}
