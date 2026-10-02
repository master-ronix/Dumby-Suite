import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/dashboard` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 */
export const dashboardCommand = defineCommand({
  name: 'dashboard',
  description: 'Opens the Dumby dashboard — the central navigation hub for all core commands and module pages.',
  pages: ['dashboard'],
  execute: (_interaction, _context) => ({
    page: 'dashboard',
    data: {
      report: 'Central navigation hub',
      modules: 8, note: 'every page is edited in place on this message',
    },
  }),
});
