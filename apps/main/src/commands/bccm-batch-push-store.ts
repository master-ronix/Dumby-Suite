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

/**
 * The knex-backed implementation of the BCCM batch-push store.
 *
 * item 2 — every query is scoped by the acting APPLICATION (`applicationId`), so the main bot and a
 * persona can hold independent command cosmetics in the SAME guild without colliding. `''` is the
 * main bot's scope.
 */
export function createKnexBccmStore(knex: Knex): BccmBatchStore {
  return {
    async pendingGuildIds(applicationId: string): Promise<readonly string[]> {
      const rows = await knex('guild_command_queue')
        .where({ status: 'pending', applicationId })
        .whereNull('deletedAt')
        .distinct<{ guildId: string }[]>('guildId');
      return rows.map((row) => String(row.guildId));
    },

    async pendingEntries(
      guildId: string,
      applicationId: string,
    ): Promise<readonly BccmQueueEntry[]> {
      // ORDERED, because the batch is a REPLAY. `applyBatch` walks the entries in order and mutates
      // one name set, so a pending disable and a pending enable for the same command resolve by
      // whichever row comes back first — and an unordered SELECT is free to return them either way.
      // A disable then an enable must end with the command PRESENT; without this it ended with
      // whatever the planner felt like. `createdAt` is the queue's own chronology; `id` breaks a tie
      // between rows written in the same millisecond.
      const rows = await knex('guild_command_queue')
        .where({ guildId, applicationId, status: 'pending' })
        .whereNull('deletedAt')
        .select('commandKey', 'payload')
        .orderBy([
          { column: 'createdAt', order: 'asc' },
          { column: 'id', order: 'asc' },
        ]);
      return rows.map(toEntry);
    },

    async dailyUsed(guildId: string, applicationId: string, nowMs: number): Promise<number> {
      // Distinct names within the window, so an in-flight row and a later confirmed row for the
      // same name are not counted twice.
      const rows = await knex('guild_command_daily_creates')
        .where({ guildId, applicationId })
        .where('expiresAt', '>', new Date(nowMs))
        .distinct<{ name: string }[]>('name');
      return rows.length;
    },

    async reserve(
      guildId: string,
      applicationId: string,
      names: readonly string[],
      nowMs: number,
    ): Promise<void> {
      if (names.length === 0) return;
      await knex('guild_command_daily_creates').insert(
        names.map((name) => ({
          guildId,
          applicationId,
          name,
          status: 'in-flight',
          expiresAt: new Date(nowMs + RESERVATION_TTL_MS),
        })),
      );
    },

    async confirm(guildId: string, applicationId: string, names: readonly string[]): Promise<void> {
      if (names.length === 0) return;
      await knex('guild_command_daily_creates')
        .where({ guildId, applicationId, status: 'in-flight' })
        .whereIn('name', [...names])
        .update({ status: 'confirmed', updatedAt: knex.fn.now() });
    },

    async dropReservations(
      guildId: string,
      applicationId: string,
      names: readonly string[],
    ): Promise<void> {
      if (names.length === 0) return;
      await knex('guild_command_daily_creates')
        .where({ guildId, applicationId, status: 'in-flight' })
        .whereIn('name', [...names])
        .delete();
    },

    async commit(
      guildId: string,
      applicationId: string,
      entries: readonly BccmQueueEntry[],
    ): Promise<void> {
      await knex.transaction(async (trx) => {
        /**
         * OI-10 — every action the batch APPLIED is persisted, not only the rename.
         *
         * `applyBatch` applies rename, alias, disable, enable and reset to Discord, and this loop used
         * to persist the rename alone: `if (entry.action !== 'rename') continue`. A queued alias or
         * disable therefore reached Discord and vanished at the next boot, because boot re-registers
         * from these tables. The `aliases` jsonb column and the `guild_command_overrides` table both
         * existed and neither was ever written.
         */
        for (const entry of entries) {
          if (entry.action === 'reset') {
            // A reset returns the command to its registered form: no rename, no alias, no override.
            await trx('guild_command_renames')
              .where({ guildId, applicationId, commandKey: entry.commandKey })
              .whereNull('deletedAt')
              .update({ deletedAt: trx.fn.now(), updatedAt: trx.fn.now() });
            await trx('guild_command_overrides')
              .where({ guildId, applicationId, commandKey: entry.commandKey })
              .whereNull('deletedAt')
              .update({ deletedAt: trx.fn.now(), updatedAt: trx.fn.now() });
            continue;
          }
          if (entry.action === 'disable' || entry.action === 'enable') {
            // Status lives in its own table; `resolveCommandStatuses` reads it oldest-first, so an
            // append is the override rather than a mutation of the previous row.
            await trx('guild_command_overrides').insert({
              guildId,
              applicationId,
              commandKey: entry.commandKey,
              overrideType: entry.action === 'disable' ? 'disabled' : 'enabled',
            });
            continue;
          }
          if (entry.action !== 'rename' && entry.action !== 'alias') continue;

          // A rename sets the new name; an alias appends to the same row. An alias with no rename is
          // still recorded — the row's `newName` is the command's own key, which means "not renamed".
          const newName = entry.action === 'rename' ? entry.newName : undefined;
          const updated = await trx('guild_command_renames')
            .where({ guildId, applicationId, commandKey: entry.commandKey })
            .whereNull('deletedAt')
            .update({
              ...(newName !== undefined ? { newName } : {}),
              // Appended, not replaced: a command may carry several aliases, and a second push must
              // not erase the first one's.
              ...(entry.alias !== undefined
                ? { aliases: trx.raw('aliases || ?::jsonb', [JSON.stringify([entry.alias])]) }
                : {}),
              updatedAt: trx.fn.now(),
            });
          if (updated === 0) {
            await trx('guild_command_renames').insert({
              guildId,
              applicationId,
              commandKey: entry.commandKey,
              newName: newName ?? entry.commandKey,
              aliases: JSON.stringify(entry.alias !== undefined ? [entry.alias] : []),
            });
          }
        }
        await trx('guild_command_queue')
          .where({ guildId, applicationId, status: 'pending' })
          .whereIn(
            'commandKey',
            entries.map((entry) => entry.commandKey),
          )
          .update({ status: 'completed', updatedAt: trx.fn.now() });
      });
    },
  };
}
