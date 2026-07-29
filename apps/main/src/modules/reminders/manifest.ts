import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Reminders module manifest (illustrative skeleton #17, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const RemindersManifest: ModuleManifest = {
  name: 'reminders',
  version: '1.0.0',
  description: 'Reminders illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['reminders.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['reminders.selftest.executed'],
  services: ['RemindersService'],
  repositories: ['RemindersRepository'],
  jobs: ['reminders-selftest-job'],
  tasks: ['reminders-selftest-heartbeat'],
  routes: ['GET /api/modules/reminders/selftest'],
  middleware: [],
  migrations: ['create_mod_reminders_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'reminders.selftest.executed',
      description: 'Emitted every time the Reminders module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
