import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Welcome module manifest (illustrative skeleton #09, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const WelcomeManifest: ModuleManifest = {
  name: 'welcome',
  version: '1.0.0',
  description: 'Welcome illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['welcome.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['welcome.selftest.executed'],
  services: ['WelcomeService'],
  repositories: ['WelcomeRepository'],
  jobs: ['welcome-selftest-job'],
  tasks: ['welcome-selftest-heartbeat'],
  routes: ['GET /api/modules/welcome/selftest'],
  middleware: [],
  migrations: ['create_mod_welcome_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'welcome.selftest.executed',
      description: 'Emitted every time the Welcome module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
