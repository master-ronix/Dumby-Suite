import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/persona` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 */
export const personaCommand = defineCommand({
  name: 'persona',
  description: 'View activated personas and their command inventory.',
  pages: ['persona'],
  execute: (_interaction, context) => ({ page: 'persona', data: context.data }),
});
