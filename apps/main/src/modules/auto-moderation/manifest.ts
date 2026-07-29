import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Auto Moderation module manifest (illustrative skeleton #05, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const AutoModerationManifest: ModuleManifest = {
  name: 'auto-moderation',
  version: '1.0.0',
  description: 'Auto Moderation illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["moderation"],
  provides: ['auto-moderation.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['auto-moderation.selftest.executed'],
  services: ['AutoModerationService'],
  repositories: ['AutoModerationRepository'],
  jobs: ['auto-moderation-selftest-job'],
  tasks: ['auto-moderation-selftest-heartbeat'],
  routes: ['GET /api/modules/auto-moderation/selftest'],
  middleware: [],
  migrations: ['create_mod_auto_moderation_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'auto-moderation.selftest.executed',
      description: 'Emitted every time the Auto Moderation module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
