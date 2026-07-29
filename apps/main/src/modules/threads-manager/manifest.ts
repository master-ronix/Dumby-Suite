import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Threads Manager module manifest (illustrative skeleton #18, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const ThreadsManagerManifest: ModuleManifest = {
  name: 'threads-manager',
  version: '1.0.0',
  description: 'Threads Manager illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['threads-manager.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['threads-manager.selftest.executed'],
  services: ['ThreadsManagerService'],
  repositories: ['ThreadsManagerRepository'],
  jobs: ['threads-manager-selftest-job'],
  tasks: ['threads-manager-selftest-heartbeat'],
  routes: ['GET /api/modules/threads-manager/selftest'],
  middleware: [],
  migrations: ['create_mod_threads_manager_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'threads-manager.selftest.executed',
      description: 'Emitted every time the Threads Manager module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
