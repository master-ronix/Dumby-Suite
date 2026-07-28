import type { ModuleManifest } from '../../modules/manifest.schema.js';

/**
 * Reaction Roles module manifest (illustrative skeleton #13, tier: standard).
 * Proves framework capability only: one service, one repository, one
 * module-owned table, one event, one job, one task, one route, one
 * locale, one dashboard schema, one eraser, one exporter. No Discord
 * commands, no product business logic (spec section 9).
 */
export const ReactionRolesManifest: ModuleManifest = {
  name: 'reaction-roles',
  version: '1.0.0',
  description: 'Reaction Roles illustrative module skeleton — self-test and status only.',
  tier: 'standard',
  hardcoded: false,

  required: false,
  depends: ["guild-settings"],
  provides: ['reaction-roles.selftest'],
  intents: [],
  partials: [],
  commands: [],
  events: ['reaction-roles.selftest.executed'],
  services: ['ReactionRolesService'],
  repositories: ['ReactionRolesRepository'],
  jobs: ['reaction-roles-selftest-job'],
  tasks: ['reaction-roles-selftest-heartbeat'],
  routes: ['GET /api/modules/reaction-roles/selftest'],
  middleware: [],
  migrations: ['create_mod_reaction_roles_selftest'],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [
    {
      name: 'reaction-roles.selftest.executed',
      description: 'Emitted every time the Reaction Roles module completes a self-test run.',
    },
  ],
  crossModuleReads: [],
};
