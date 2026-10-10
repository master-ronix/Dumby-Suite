import { defineCommand } from '@workspace/swastik';

/**
 * interface.md §5.3 / ADR-013 — the `/browse` command is a marketplace discovery surface: only
 * marketplace-tier modules (and unloaded standard-tier modules) are offered for install, and
 * installed modules are removed from the install dropdown. The list is gathered by the host at
 * dispatch (§1.7); the module declares no static list.
 */
export const browseCommand = defineCommand({
  name: 'browse',
  description: 'Browse the marketplace, discover modules, and install them.',
  pages: ['marketplace'],
  execute: (_interaction, context) => ({ page: 'marketplace', data: context.data }),
});
