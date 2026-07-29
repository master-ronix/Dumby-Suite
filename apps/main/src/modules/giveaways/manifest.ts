import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Giveaways module manifest (illustrative skeleton #19, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const GiveawaysManifest: ModuleManifest = {
  name: 'giveaways',
  version: '1.0.0',
  description: 'Giveaways illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['giveaways.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['giveaways.selftest.executed'],
  services: ['GiveawaysService'],
  repositories: ['GiveawaysRepository'],
  jobs: ['giveaways-selftest-job'],
  tasks: ['giveaways-selftest-heartbeat'],
  routes: ['GET /api/modules/giveaways/selftest'],
  middleware: [],
  migrations: ['create_mod_giveaways_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'giveaways.selftest.executed',
      description: 'Emitted every time the Giveaways module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
