import { defineCommand } from '@workspace/swastik';

/**
 * interface.md §10.5 / ADR-013 — the `/hello` command is a declared schema plus a data-returning
 * handler. The page is a single coherent body: a title and the greeting. Version strings and the
 * developer credit are gone from the surface; the module footer is issued by the Renderer.
 */
export const helloCommand = defineCommand({
  name: 'hello',
  description: 'Responds with a hello world greeting',
  pages: ['greeting'],
  permissions: { rbac: 'MEMBER' },
  execute: (_interaction, context) => ({
    page: 'greeting',
    data: {
      title: 'Hello World',
      lines: [String(context.config['greeting'] ?? 'Hello, World!')],
    },
  }),
});
