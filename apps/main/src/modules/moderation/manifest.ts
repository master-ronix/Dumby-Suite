import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Moderation module manifest (illustrative skeleton #04, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const ModerationManifest: ModuleManifest = {
  name: 'moderation',
  version: '1.0.0',
  description: 'Moderation illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['moderation.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['moderation.selftest.executed'],
  services: ['ModerationService'],
  repositories: ['ModerationRepository'],
  jobs: ['moderation-selftest-job'],
  tasks: ['moderation-selftest-heartbeat'],
  routes: ['GET /api/modules/moderation/selftest'],
  middleware: [],
  migrations: ['create_mod_moderation_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'moderation.selftest.executed',
      description: 'Emitted every time the Moderation module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
