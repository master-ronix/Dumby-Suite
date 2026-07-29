/**
 * Module template manifest — the canonical reference for what a well-formed
 * manifest looks like. The scaffold script (scripts/scaffold-module.ts) uses
 * this as its template; every field here has a comment explaining its role.
 *
 * This module is NEVER registered in the bootstrap. It exists only so:
 *   1. `pnpm scaffold:module` has a live example to copy from.
 *   2. Developers can compare their module manifest against a known-good one.
 */
import type { ModuleManifest } from '../manifest.schema.js';

export const TemplateManifest: ModuleManifest = {
  // kebab-case, unique across all modules.
  name: '_template',
  version: '0.0.0',
  description: 'Template / reference module — not loaded at runtime.',
  // admin | core | standard | marketplace
  tier: 'standard',
  // hardcoded + hardcodeGuildId are mutually exclusive with releaseStatus.
  hardcoded: false,
  releaseStatus: 'alpha',
  // devId and buildId are issued by the Credentials Service + Swastik pipeline.
  devId: undefined,
  buildId: undefined,
  // required:true means a load failure is a fatal bootstrap error.
  required: false,
  depends: [],
  provides: [],
  intents: [],
  partials: [],
  commands: [],
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
