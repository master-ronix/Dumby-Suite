import { definePage, type ModulePageContext, type ModulePageReadModel } from '@workspace/swastik';

/**
 * UR-20261027-106 — the queue module owns its page.
 *
 * This composition used to live in `apps/main/src/rendering/page-data.ts` (`queue()`). The page is a
 * list of what is WAITING, and it says so plainly: the batching window is a property of the queue's
 * design (§15.8), not of this rendering, so it is stated once in the Batch group rather than implied
 * by the entries.
 *
 * What the module owns is the formatting; what the framework owns is the read. `pendingQueue()`
 * returns the actions oldest-first, already mapped — a module asks what is pending, not how the
 * `guild_command_queue` table is shaped.
 */
export interface QueuePageData {
  title: string;
  groups: {
    name: string;
    rows: [string, string][];
  }[];
  lines: string[];
}

export const queuePage = definePage({
  id: 'queue',

  async render(_context: ModulePageContext, read: ModulePageReadModel): Promise<QueuePageData> {
    const entries = await read.pendingQueue();

    const lines = entries.map((entry, index) => {
      const parts = [`#${index + 1}`, `Action: ${entry.action}`, `Command: ${entry.commandKey}`];
      if (entry.newName !== undefined) parts.push(`New Name: ${entry.newName}`);
      if (entry.alias !== undefined) parts.push(`Alias: ${entry.alias}`);
      if (entry.disable !== undefined) parts.push(`Disable: ${String(entry.disable)}`);
      parts.push('Status: Queued');
      return parts.join('   |   ');
    });

    const pending = entries.length;
    return {
      title: 'Pending Command Queue Actions',
      groups: [
        {
          name: 'Batch',
          rows: [
            ['Window', 'changes are batched and pushed within the 12–13 hour window (§15.8)'],
            ['Total queued', String(pending)],
            ['Next batch push', 'within 12–13h'],
          ],
        },
      ],
      lines: pending === 0 ? ['No pending queue actions.'] : lines,
    };
  },
});
