import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Logging module manifest (illustrative skeleton #08, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const LoggingManifest: ModuleManifest = {
  name: 'logging',
  version: '1.0.0',
  description: 'Logging illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['logging.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['logging.selftest.executed'],
  services: ['LoggingService'],
  repositories: ['LoggingRepository'],
  jobs: ['logging-selftest-job'],
  tasks: ['logging-selftest-heartbeat'],
  routes: ['GET /api/modules/logging/selftest'],
  middleware: [],
  migrations: ['create_mod_logging_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'logging.selftest.executed',
      description: 'Emitted every time the Logging module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
