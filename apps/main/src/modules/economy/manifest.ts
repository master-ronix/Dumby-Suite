import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Economy module manifest (illustrative skeleton #11, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const EconomyManifest: ModuleManifest = {
  name: 'economy',
  version: '1.0.0',
  description: 'Economy illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['economy.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['economy.selftest.executed'],
  services: ['EconomyService'],
  repositories: ['EconomyRepository'],
  jobs: ['economy-selftest-job'],
  tasks: ['economy-selftest-heartbeat'],
  routes: ['GET /api/modules/economy/selftest'],
  middleware: [],
  migrations: ['create_mod_economy_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'economy.selftest.executed',
      description: 'Emitted every time the Economy module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
