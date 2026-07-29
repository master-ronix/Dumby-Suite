import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Integrations module manifest (illustrative skeleton #22, tier: marketplace).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const IntegrationsManifest: ModuleManifest = {
  name: 'integrations',
  version: '1.0.0',
  description: 'Integrations illustrative module skeleton — self-test and status only.',
  tier: 'marketplace',
  hardcoded: false,
  marketplaceCategory: "utility",
  required: false,
  depends: [],
  provides: ['integrations.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['integrations.selftest.executed'],
  services: ['IntegrationsService'],
  repositories: ['IntegrationsRepository'],
  jobs: ['integrations-selftest-job'],
  tasks: ['integrations-selftest-heartbeat'],
  routes: ['GET /api/modules/integrations/selftest'],
  middleware: [],
  migrations: ['create_mod_integrations_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'integrations.selftest.executed',
      description: 'Emitted every time the Integrations module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
