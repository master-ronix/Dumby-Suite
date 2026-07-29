import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Starboard module manifest (illustrative skeleton #12, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const StarboardManifest: ModuleManifest = {
  name: 'starboard',
  version: '1.0.0',
  description: 'Starboard illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['starboard.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['starboard.selftest.executed'],
  services: ['StarboardService'],
  repositories: ['StarboardRepository'],
  jobs: ['starboard-selftest-job'],
  tasks: ['starboard-selftest-heartbeat'],
  routes: ['GET /api/modules/starboard/selftest'],
  middleware: [],
  migrations: ['create_mod_starboard_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'starboard.selftest.executed',
      description: 'Emitted every time the Starboard module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
