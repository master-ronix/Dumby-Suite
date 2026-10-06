import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/modules` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 */
export const modulesCommand = defineCommand({
  name: 'modules',
  description: 'View activated/installed/standard-tier modules and manage them.',
  pages: ['modules'],
  execute: (_interaction, _context) => ({
    page: 'modules',
    data: {
      report: 'Installed & Standard-Tier Modules',
      installed: '8 core modules', standardTier: 'hello-world', note: 'uninstall requires Discord Administrator permission',
    },
  }),
});
