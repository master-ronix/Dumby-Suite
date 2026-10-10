import { defineCommand } from '@workspace/swastik';

/**
 * interface.md §3.6 / ADR-013 — the `/dashboard` command declares its page and returns the
 * host-gathered page data. The core command list is registered dynamically by the host (§1.7);
 * the module declares no static list, and no separate dashboard pages exist for core modules —
 * only standard-tier modules carry a page under the dashboard.
 */
export const dashboardCommand = defineCommand({
  name: 'dashboard',
  description:
    'Opens the Dumby dashboard — the central navigation hub for all core commands and module pages.',
  pages: ['dashboard'],
  execute: (_interaction, context) => ({ page: 'dashboard', data: context.data }),
});
