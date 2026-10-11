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

/** UR-20261011-023 — the minimal registry shape the payload builder needs. */
export interface CommandDefinitionLike {
  data: object;
}
export interface CommandLookup {
  get(name: string): CommandDefinitionLike | undefined;
}

/**
 * UR-20261011-023 — Discord's command-name rule: 1–32 characters from
 * `[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]`, lowercase only. Because the BCCM sends a BULK
 * overwrite, one invalid name rejects the WHOLE batch and nothing changes — so an invalid name must
 * never be sent.
 */
export function isValidCommandName(name: string): boolean {
  return /^[-_\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,32}$/u.test(name) && name === name.toLowerCase();
}

/**
 * UR-20261011-023 — Discord's bulk overwrite needs a FULL command object (a `name` AND a
 * `description`); sending `{ name }` alone is rejected with a 400, which is what made the first
 * real BCCM push fail. Resolve each desired name to its registered definition, keeping the
 * requested name (a rename target is not a registry key, so it falls back to a minimal valid
 * object and is reported).
 */
export function resolveCommandPayloads(
  names: readonly string[],
  registry: CommandLookup,
  onProblem?: (name: string, reason: 'invalid-name' | 'unresolved') => void,
): object[] {
  const payloads: object[] = [];
  for (const name of names) {
    if (!isValidCommandName(name)) {
      // Dropped, not sent: one invalid name fails the entire bulk overwrite.
      onProblem?.(name, 'invalid-name');
      continue;
    }
    const definition = registry.get(name);
    if (definition === undefined) {
      onProblem?.(name, 'unresolved');
      payloads.push({ name, description: name });
      continue;
    }
    payloads.push({ ...definition.data, name });
  }
  return payloads;
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
      // The summary is in the message as well as the context, so it reads in a log viewer that
      // renders only `msg`.
      logger.info(
        `bccm-batch-dry-run guild=${guildId} pending=${entries.length} new=${fresh.length}`,
        { guildId, pending: entries.length, desired, newNames: fresh },
      );
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
      // The log viewer drops a record's structured fields, so the message string carries the error
      // text — which for a Discord API error includes the HTTP status and code — directly (the
      // `command-execution-error` pattern), with the status also named when the error carries one.
      const status = (err as { status?: number }).status;
      logger.error(
        `bccm-batch-put-failed guild=${guildId}${status === undefined ? '' : ` status=${status}`}: ${String(err)}`,
        { guildId, error: String(err) },
      );
      guilds.push({ ...base, sent: false, skippedReason: 'put-failed' });
      continue;
    }

    await store.confirm(guildId, fresh);
    await store.commit(guildId, entries);
    guilds.push({ ...base, sent: true });
  }

  const sent = guilds.filter((g) => g.sent).length;
  logger.info(`bccm-batch-push-complete dryRun=${dryRun} guilds=${guilds.length} sent=${sent}`, {
    dryRun,
    guilds: guilds.length,
    sent,
  });
  return { dryRun, guilds };
}
