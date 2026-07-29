import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Guild Settings module manifest (illustrative skeleton #02, tier: core).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const GuildSettingsManifest: ModuleManifest = {
  name: 'guild-settings',
  version: '1.0.0',
  description: 'Guild Settings illustrative module skeleton — self-test and status only.',
  tier: 'core',
  hardcoded: false,

  required: true,
  depends: [],
  provides: ['guild-settings.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['guild-settings.selftest.executed'],
  services: ['GuildSettingsService'],
  repositories: ['GuildSettingsRepository'],
  jobs: ['guild-settings-selftest-job'],
  tasks: ['guild-settings-selftest-heartbeat'],
  routes: ['GET /api/modules/guild-settings/selftest'],
  middleware: [],
  migrations: ['create_mod_guild_settings_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'guild-settings.selftest.executed',
      description: 'Emitted every time the Guild Settings module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
