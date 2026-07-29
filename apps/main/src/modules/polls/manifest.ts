import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Polls module manifest (illustrative skeleton #14, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const PollsManifest: ModuleManifest = {
  name: 'polls',
  version: '1.0.0',
  description: 'Polls illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['polls.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['polls.selftest.executed'],
  services: ['PollsService'],
  repositories: ['PollsRepository'],
  jobs: ['polls-selftest-job'],
  tasks: ['polls-selftest-heartbeat'],
  routes: ['GET /api/modules/polls/selftest'],
  middleware: [],
  migrations: ['create_mod_polls_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'polls.selftest.executed',
      description: 'Emitted every time the Polls module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
