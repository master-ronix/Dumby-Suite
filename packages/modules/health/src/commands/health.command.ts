import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/health` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 */
export const healthCommand = defineCommand({
  name: 'health',
  description: 'Displays comprehensive system health and diagnostic information.',
  pages: ['health'],
  execute: (_interaction, context) => ({ page: 'health', data: context.data }),
});
