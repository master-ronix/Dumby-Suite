import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Core Admin module manifest (illustrative skeleton #01, tier: admin).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const CoreAdminManifest: ModuleManifest = {
  name: 'core-admin',
  version: '1.0.0',
  description: 'Core Admin illustrative module skeleton — self-test and status only.',
  tier: 'admin',
  hardcoded: false,
  devGuildOnly: true,
  required: true,
  depends: [],
  provides: ['core-admin.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['core-admin.selftest.executed'],
  services: ['CoreAdminService'],
  repositories: ['CoreAdminRepository'],
  jobs: ['core-admin-selftest-job'],
  tasks: ['core-admin-selftest-heartbeat'],
  routes: ['GET /api/modules/core-admin/selftest'],
  middleware: [],
  migrations: ['create_mod_core_admin_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'core-admin.selftest.executed',
      description: 'Emitted every time the Core Admin module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
