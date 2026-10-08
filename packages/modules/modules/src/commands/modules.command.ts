import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/modules` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 *
 * §9.3 — the modules page lists installed and Standard-tier modules with their version, tier
 * and purpose, and offers a details dropdown per installed module (§9.5).
 */
export const modulesCommand = defineCommand({
  name: 'modules',
  description: 'View activated/installed/standard-tier modules and manage them.',
  pages: ['modules'],
  execute: (_interaction, _context) => ({
    page: 'modules',
    data: {
      title: 'Installed & Standard-Tier Modules',
      lines: [
        '✅ dashboard    v1.0.0   Core      — Central navigation',
        '✅ health       v1.0.0   Core      — System health',
        '✅ browse       v1.0.0   Core      — Marketplace',
        '✅ queue        v1.0.0   Core      — BCCM queue mgmt',
        '✅ persona      v1.0.0   Core      — Persona listing',
        '✅ permit       v1.0.0   Core      — Grant management',
        '✅ modules      v1.0.0   Core      — Module management',
        '✅ hello-world  v1.0.0   Standard  — Hello world test',,
      ],
    },
  }),
});
