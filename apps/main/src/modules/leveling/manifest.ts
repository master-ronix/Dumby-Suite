import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Leveling module manifest (illustrative skeleton #10, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const LevelingManifest: ModuleManifest = {
  name: 'leveling',
  version: '1.0.0',
  description: 'Leveling illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['leveling.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['leveling.selftest.executed'],
  services: ['LevelingService'],
  repositories: ['LevelingRepository'],
  jobs: ['leveling-selftest-job'],
  tasks: ['leveling-selftest-heartbeat'],
  routes: ['GET /api/modules/leveling/selftest'],
  middleware: [],
  migrations: ['create_mod_leveling_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'leveling.selftest.executed',
      description: 'Emitted every time the Leveling module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
