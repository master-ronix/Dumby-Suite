import { defineCommand } from '@workspace/swastik';

/**
 * interface.md §10.5 — the `/hello` command is authored as a declared schema plus a
 * data-returning handler. The module never constructs components, embeds or flags: the Renderer
 * derives the entire presentation from the returned page data.
 */
export const helloCommand = defineCommand({
  name: 'hello',
  description: 'Responds with a hello world greeting',
  pages: ['greeting'],
  permissions: { rbac: 'MEMBER' },
  execute: (_interaction, context) => ({
    page: 'greeting',
    data: {
      greeting: String(context.config['greeting'] ?? 'Hello, World!'),
      module: 'hello-world',
      version: '1.0.0',
      developer: 'Quixotic Mnemonics',
    },
  }),
});
