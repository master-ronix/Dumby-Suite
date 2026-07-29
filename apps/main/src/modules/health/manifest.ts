/**
 * Health module manifest (Core tier). Implements the /health slash command
 * (interface.md §5.2). Pre-installed permanently; cannot be disabled.
 */
import type { ModuleManifest } from '../manifest.schema.js';

export const HealthManifest: ModuleManifest = {
  name: 'health',
  version: '1.0.0',
  description: 'Displays gateway ping and command round-trip latency.',
  tier: 'core',
  hardcoded: false,
  releaseStatus: 'stable',
  // devId and buildId are issued via the Credentials Service + Swastik pipeline.
  // These placeholder values must be replaced with real Swastik-issued IDs before
  // a production deploy. See apps/main/docs/runbooks/swastik-registration.md.
  devId: 'dumby-core',
  buildId: 'health-v1.0.0',
  required: true,
  depends: [],
  provides: [],
  intents: [],
  partials: [],
  commands: [
    {
      name: 'health',
      description: 'Shows the bot\'s current ping and latency.',
    },
  ],
  events: [],
  services: [],
  repositories: [],
  jobs: [],
  tasks: [],
  routes: [],
  middleware: [],
  migrations: [],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [],
  crossModuleReads: [],
};
