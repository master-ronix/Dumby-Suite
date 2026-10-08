import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/browse` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 *
 * §5.3 — the marketplace page lists installed and Standard-tier modules with their version,
 * tier and purpose. The deployment's module set is fixed by the image, so the rows are
 * declared here rather than read from a registry the module cannot reach.
 */
export const browseCommand = defineCommand({
  name: 'browse',
  description: 'Browse the marketplace, discover modules, and install them.',
  pages: ['marketplace'],
  execute: (_interaction, _context) => ({
    page: 'marketplace',
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
