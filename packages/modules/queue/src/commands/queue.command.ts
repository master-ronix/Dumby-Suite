import { defineCommand } from '@workspace/swastik';

/** §6.3 — the declared arguments, read by the handler to build a queue request. */
interface QueueOptions {
  getString(name: string): string | null;
  getBoolean(name: string): boolean | null;
}

/**
 * interface.md — the `/queue` command is authored as a declared schema plus a data-returning
 * handler. The Renderer derives the entire presentation; the module never constructs components,
 * embeds or flags.
 *
 * §6.7 — invoked with arguments, the command declares a `bccm.submit` effect. A module cannot
 * reach the queue table itself, so it asks the host to write the entry; with no arguments the
 * command is the queue list view (§6.5).
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
  execute: (interaction, context) => {
    const options = (interaction as { options?: QueueOptions }).options;
    const commandKey = options?.getString('command') ?? undefined;
    if (commandKey === undefined) {
      return { page: 'queue', data: context.data };
    }
    const alias = options?.getString('alias') ?? undefined;
    const newName = options?.getString('new-name') ?? undefined;
    const disable = options?.getBoolean('disable') ?? undefined;
    const action = options?.getString('action') ?? undefined;
    return {
      page: 'queue',
      data: context.data,
      effects: [
        {
          kind: 'bccm.submit',
          payload: {
            commandKey,
            ...(action !== undefined ? { action } : {}),
            ...(alias !== undefined ? { alias } : {}),
            ...(newName !== undefined ? { newName } : {}),
            ...(disable !== undefined ? { disable } : {}),
          },
        },
      ],
    };
  },
});
