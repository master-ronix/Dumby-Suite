import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Music module manifest (illustrative skeleton #21, tier: marketplace).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const MusicManifest: ModuleManifest = {
  name: 'music',
  version: '1.0.0',
  description: 'Music illustrative module skeleton — self-test and status only.',
  tier: 'marketplace',
  hardcoded: false,
  marketplaceCategory: "entertainment",
  required: false,
  depends: [],
  provides: ['music.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['music.selftest.executed'],
  services: ['MusicService'],
  repositories: ['MusicRepository'],
  jobs: ['music-selftest-job'],
  tasks: ['music-selftest-heartbeat'],
  routes: ['GET /api/modules/music/selftest'],
  middleware: [],
  migrations: ['create_mod_music_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'music.selftest.executed',
      description: 'Emitted every time the Music module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
