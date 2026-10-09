import type { Logger } from '../logging/logger.js';
import type { CommandCeilingService } from './command-ceiling.js';

/** §17.7 — Discord caps application command creates at 200 per guild per rolling day. */
export const DAILY_CREATE_LIMIT = 200;
/** An uncertain reservation counts conservatively until the window rolls. */
export const RESERVATION_TTL_MS = 24 * 60 * 60 * 1000;

/** A command as Discord knows it. Only `name` matters for the "is this new?" diff. */
export interface RegisteredCommand {
  readonly name: string;
}

/**
 * The minimal Discord surface the batch push needs. `getRegistered` is the authority for what
 * "new" means — the local view may drift after a crash or a manual change.
 */
export interface BccmDiscordClient {
  getRegistered(guildId: string): Promise<readonly RegisteredCommand[]>;
  putCommands(guildId: string, commands: readonly RegisteredCommand[]): Promise<void>;
}

/** One queued change, projected from a `guild_command_queue` row. */
export interface BccmQueueEntry {
  readonly commandKey: string;
  readonly action: string;
  readonly newName?: string;
  readonly alias?: string;
}

/**
 * The persistence the batch push needs. Kept as an interface so the logic is testable without a
 * database; the knex implementation lives in `bccm-batch-push-store.ts`.
 */
export interface BccmBatchStore {
  pendingGuildIds(): Promise<readonly string[]>;
  pendingEntries(guildId: string): Promise<readonly BccmQueueEntry[]>;
  /** Distinct new names reserved or confirmed for the guild within the window. */
  dailyUsed(guildId: string, nowMs: number): Promise<number>;
  reserve(guildId: string, names: readonly string[], nowMs: number): Promise<void>;
  confirm(guildId: string, names: readonly string[]): Promise<void>;
  dropReservations(guildId: string, names: readonly string[]): Promise<void>;
  /** One transaction: write the rename view and mark the batch's queue entries done. */
  commit(guildId: string, entries: readonly BccmQueueEntry[]): Promise<void>;
}

export interface BccmBatchPushDeps {
  store: BccmBatchStore;
  logger: Logger;
  ceiling: CommandCeilingService;
  discord: BccmDiscordClient;
  /** When true the task computes and logs the batch but writes nothing and sends nothing. */
  dryRun: boolean;
  now?: () => number;
}

/**
 * The desired command set for a guild: the registered set with the batch's renames, aliases and
 * disables applied. A rename changes what a command is called, never how it is invoked (§17.8).
 */
export function applyBatch(
  registered: readonly RegisteredCommand[],
  entries: readonly BccmQueueEntry[],
): string[] {
  const names = new Set(registered.map((command) => command.name));
  for (const entry of entries) {
    if (entry.action === 'rename' && entry.newName !== undefined) {
      names.delete(entry.commandKey);
      names.add(entry.newName);
    } else if (entry.action === 'alias' && entry.alias !== undefined) {
      names.add(entry.alias);
    } else if (entry.action === 'disable') {
      names.delete(entry.commandKey);
    } else if (entry.action === 'enable' || entry.action === 'reset') {
      names.add(entry.commandKey);
    }
  }
  return [...names];
}

/** New names = desired − registered, diffed against Discord (the authority for "new"). */
export function newNames(
  registered: readonly RegisteredCommand[],
  desired: readonly string[],
): string[] {
  const existing = new Set(registered.map((command) => command.name));
  return desired.filter((name) => !existing.has(name));
}

/** Discord error 30034 — the daily application-command-create limit has been reached. */
export function isDailyCreateLimitError(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === 30034;
}

export interface GuildBatchReport {
  guildId: string;
  pending: number;
  newNames: string[];
  sent: boolean;
  skippedReason?: 'ceiling' | 'daily-limit' | 'dry-run' | 'over-limit' | 'put-failed';
}

export interface BccmBatchPushReport {
  dryRun: boolean;
  guilds: GuildBatchReport[];
}

/**
 * §17.7/§17.8 — the BCCM batch push. Consumes every guild's pending queue entries as a single
 * bulk overwrite of that guild's command set. The push is idempotent (it always sends the full
 * desired set), so a batch left `pending` after a crash is converged by the next cycle's re-push.
 * In dry-run mode it computes and logs the batch and changes nothing at all.
 */
export async function runBccmBatchPush(deps: BccmBatchPushDeps): Promise<BccmBatchPushReport> {
  const { store, logger, ceiling, discord, dryRun } = deps;
  const nowMs = deps.now?.() ?? Date.now();
  const guilds: GuildBatchReport[] = [];

  for (const guildId of await store.pendingGuildIds()) {
    const entries = await store.pendingEntries(guildId);
    const registered = await discord.getRegistered(guildId);
    const desired = applyBatch(registered, entries);
    const fresh = newNames(registered, desired);
    const base = { guildId, pending: entries.length, newNames: fresh };

    try {
      await ceiling.guard(guildId);
    } catch {
      logger.warn('bccm-batch-ceiling', { guildId, pending: entries.length });
      guilds.push({ ...base, sent: false, skippedReason: 'ceiling' });
      continue;
    }

    if ((await store.dailyUsed(guildId, nowMs)) + fresh.length > DAILY_CREATE_LIMIT) {
      logger.warn('bccm-batch-daily-limit', { guildId, newNames: fresh.length });
      guilds.push({ ...base, sent: false, skippedReason: 'daily-limit' });
      continue;
    }

    if (dryRun) {
      // Dry-run is log-only: the queue, the rename view and the daily tally are all left untouched.
      logger.info('bccm-batch-dry-run', {
        guildId,
        pending: entries.length,
        desired,
        newNames: fresh,
      });
      guilds.push({ ...base, sent: false, skippedReason: 'dry-run' });
      continue;
    }

    // Reserve the names before the send, so a crash between the PUT and the commit cannot
    // undercount the daily budget.
    await store.reserve(guildId, fresh, nowMs);
    try {
      await discord.putCommands(
        guildId,
        desired.map((name) => ({ name })),
      );
    } catch (err) {
      if (isDailyCreateLimitError(err)) {
        // Over-limit is a safe failure: leave the reservation and retry on the next cycle.
        logger.warn('bccm-batch-over-limit', { guildId });
        guilds.push({ ...base, sent: false, skippedReason: 'over-limit' });
        continue;
      }
      await store.dropReservations(guildId, fresh);
      logger.error('bccm-batch-put-failed', { guildId, error: String(err) });
      guilds.push({ ...base, sent: false, skippedReason: 'put-failed' });
      continue;
    }

    await store.confirm(guildId, fresh);
    await store.commit(guildId, entries);
    guilds.push({ ...base, sent: true });
  }

  logger.info('bccm-batch-push-complete', { dryRun, guilds: guilds.length });
  return { dryRun, guilds };
}
