import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/browse` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 */
export const browseCommand = defineCommand({
  name: 'browse',
  description: 'Browse the marketplace, discover modules, and install them.',
  pages: ['marketplace'],
  execute: (_interaction, _context) => ({
    page: 'marketplace',
    data: {
      report: 'Marketplace',
      installed: '8 core modules', standardTier: 'hello-world', note: 'installs require Discord Administrator permission',
    },
  }),
});
