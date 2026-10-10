import type { Knex } from 'knex';
import { RESERVATION_TTL_MS, type BccmBatchStore, type BccmQueueEntry } from './bccm-batch-push.js';

function toEntry(row: unknown): BccmQueueEntry {
  const r = row as { commandKey?: unknown; payload?: unknown };
  const payload = (r.payload ?? {}) as Record<string, unknown>;
  return {
    commandKey: String(r.commandKey ?? ''),
    action: String(payload['action'] ?? 'rename'),
    ...(typeof payload['newName'] === 'string' ? { newName: payload['newName'] } : {}),
    ...(typeof payload['alias'] === 'string' ? { alias: payload['alias'] } : {}),
  };
}

/** The knex-backed implementation of the BCCM batch-push store. */
export function createKnexBccmStore(knex: Knex): BccmBatchStore {
  return {
    async pendingGuildIds(): Promise<readonly string[]> {
      const rows = await knex('guild_command_queue')
        .where({ status: 'pending' })
        .whereNull('deletedAt')
        .distinct<{ guildId: string }[]>('guildId');
      return rows.map((row) => String(row.guildId));
    },

    async pendingEntries(guildId: string): Promise<readonly BccmQueueEntry[]> {
      const rows = await knex('guild_command_queue')
        .where({ guildId, status: 'pending' })
        .whereNull('deletedAt')
        .select('commandKey', 'payload');
      return rows.map(toEntry);
    },

    async dailyUsed(guildId: string, nowMs: number): Promise<number> {
      // Distinct names within the window, so an in-flight row and a later confirmed row for the
      // same name are not counted twice.
      const rows = await knex('guild_command_daily_creates')
        .where({ guildId })
        .where('expiresAt', '>', new Date(nowMs))
        .distinct<{ name: string }[]>('name');
      return rows.length;
    },

    async reserve(guildId: string, names: readonly string[], nowMs: number): Promise<void> {
      if (names.length === 0) return;
      await knex('guild_command_daily_creates').insert(
        names.map((name) => ({
          guildId,
          name,
          status: 'in-flight',
          expiresAt: new Date(nowMs + RESERVATION_TTL_MS),
        })),
      );
    },

    async confirm(guildId: string, names: readonly string[]): Promise<void> {
      if (names.length === 0) return;
      await knex('guild_command_daily_creates')
        .where({ guildId, status: 'in-flight' })
        .whereIn('name', [...names])
        .update({ status: 'confirmed', updatedAt: knex.fn.now() });
    },

    async dropReservations(guildId: string, names: readonly string[]): Promise<void> {
      if (names.length === 0) return;
      await knex('guild_command_daily_creates')
        .where({ guildId, status: 'in-flight' })
        .whereIn('name', [...names])
        .delete();
    },

    async commit(guildId: string, entries: readonly BccmQueueEntry[]): Promise<void> {
      await knex.transaction(async (trx) => {
        for (const entry of entries) {
          if (entry.action !== 'rename' || entry.newName === undefined) continue;
          const updated = await trx('guild_command_renames')
            .where({ guildId, commandKey: entry.commandKey })
            .whereNull('deletedAt')
            .update({ newName: entry.newName, updatedAt: trx.fn.now() });
          if (updated === 0) {
            await trx('guild_command_renames').insert({
              guildId,
              commandKey: entry.commandKey,
              newName: entry.newName,
            });
          }
        }
        await trx('guild_command_queue')
          .where({ guildId, status: 'pending' })
          .whereIn(
            'commandKey',
            entries.map((entry) => entry.commandKey),
          )
          .update({ status: 'completed', updatedAt: trx.fn.now() });
      });
    },
  };
}
