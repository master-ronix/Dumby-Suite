import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Anti Raid module manifest (illustrative skeleton #06, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const AntiRaidManifest: ModuleManifest = {
  name: 'anti-raid',
  version: '1.0.0',
  description: 'Anti Raid illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["moderation"],
  provides: ['anti-raid.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['anti-raid.selftest.executed'],
  services: ['AntiRaidService'],
  repositories: ['AntiRaidRepository'],
  jobs: ['anti-raid-selftest-job'],
  tasks: ['anti-raid-selftest-heartbeat'],
  routes: ['GET /api/modules/anti-raid/selftest'],
  middleware: [],
  migrations: ['create_mod_anti_raid_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'anti-raid.selftest.executed',
      description: 'Emitted every time the Anti Raid module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
