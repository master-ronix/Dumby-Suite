import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Utility module manifest (illustrative skeleton #03, tier: core).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const UtilityManifest: ModuleManifest = {
  name: 'utility',
  version: '1.0.0',
  description: 'Utility illustrative module skeleton — self-test and status only.',
  tier: 'core',
  hardcoded: false,

  required: true,
  depends: [],
  provides: ['utility.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['utility.selftest.executed'],
  services: ['UtilityService'],
  repositories: ['UtilityRepository'],
  jobs: ['utility-selftest-job'],
  tasks: ['utility-selftest-heartbeat'],
  routes: ['GET /api/modules/utility/selftest'],
  middleware: [],
  migrations: ['create_mod_utility_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'utility.selftest.executed',
      description: 'Emitted every time the Utility module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
