/**
 * Hello module manifest (Core tier). Implements the /hello slash command
 * (interface.md §5.3). Pre-installed permanently; cannot be disabled.
 */
import type { ModuleManifest } from '../manifest.schema.js';

export const HelloManifest: ModuleManifest = {
  name: 'hello',
  version: '1.0.0',
  description: 'Displays a "Hello, World!" greeting.',
  tier: 'core',
  hardcoded: false,
  releaseStatus: 'stable',
  devId: 'dumby-core',
  buildId: 'hello-v1.0.0',
  required: true,
  depends: [],
  provides: [],
  intents: [],
  partials: [],
  commands: [
    {
      name: 'hello',
      description: 'Says hello.',
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
