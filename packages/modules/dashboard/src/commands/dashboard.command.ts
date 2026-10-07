import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/dashboard` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 *
 * §3.6 — the dashboard home page displays a direct list of the Core Command Surface's
 * Core-tier commands (one Core-tier module per command). `/hello` (hello-world,
 * Standard-tier) is deliberately not part of the Core command list; it belongs in the
 * navigation dropdown under installed modules (§3.7).
 */
export const dashboardCommand = defineCommand({
  name: 'dashboard',
  description:
    'Opens the Dumby dashboard — the central navigation hub for all core commands and module pages.',
  pages: ['dashboard'],
  execute: (_interaction, _context) => ({
    page: 'dashboard',
    data: {
      commands: [
        '**Core Commands**',
        '',
        '/health — System health, ping & latency',
        '/browse — Browse the module marketplace',
        '/queue — Manage BCCM command queue actions',
        '/persona — View active personas & command inventory',
        '/permit — Manage guild-side grants, lists & limits',
        '/modules — View, manage & uninstall installed modules',
      ].join('\n'),
    },
  }),
});
