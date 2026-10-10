import { defineCommand } from '@workspace/swastik';

/**
 * interface.md §9.3 / ADR-013 — the `/modules` command lists only installed/enabled modules,
 * gathered by the host at dispatch (§1.7); the module declares no static list.
 */
export const modulesCommand = defineCommand({
  name: 'modules',
  description: 'View activated/installed/standard-tier modules and manage them.',
  pages: ['modules'],
  execute: (_interaction, context) => ({ page: 'modules', data: context.data }),
});
