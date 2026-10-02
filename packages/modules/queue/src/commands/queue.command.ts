import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/queue` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 */
export const queueCommand = defineCommand({
  name: 'queue',
  description: 'Manage BCCM command queue actions — submit, view, edit, and cancel pending command changes.',
  pages: ['queue'],
  options: [
    { name: 'command', description: 'The command name to queue an action for', type: 3, autocomplete: true },
    { name: 'alias', description: 'An alias name to add for the command', type: 3 },
    { name: 'new-name', description: 'A new name to rename the command to', type: 3 },
    { name: 'disable', description: 'Set true to disable the command, false to re-enable', type: 5 },
    { name: 'action', description: 'The BCCM action type', type: 3 },
  ],
  execute: (_interaction, _context) => ({
    page: 'queue',
    data: {
      report: 'BCCM command queue',
      window: '12-13h batching window', pending: 0, note: 'submission requires Administrator or Manage Guild',
    },
  }),
});
