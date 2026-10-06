import type { Knex } from 'knex';

/**
 * blueprint.md §22.2 / Table 22-A — the `suspendGuild` control action's state.
 *
 * `suspendGuild` is the broadest of the four original suspend primitives: it "immediately blocks
 * the bot from responding to ANY interaction originating in the named guild, fleet-wide,
 * regardless of that guild's own configuration". The state therefore lives above
 * `guild_module_states` — a suspension overrides a guild's configuration rather than editing it —
 * and the dispatch path must consult it before anything else (§3's flow: SUSPENDED → stop
 * dispatching).
 */
export interface GuildSuspensionRecord {
  readonly guildId: string;
  readonly suspendedBy: string;
  readonly reason: string;
  readonly suspendedAt: number;
}

export interface GuildSuspensionStore {
  suspend(record: GuildSuspensionRecord): Promise<void>;
  /** Returns true when a suspension existed and was lifted. */
  unsuspend(guildId: string): Promise<boolean>;
  isSuspended(guildId: string): Promise<boolean>;
  list(): Promise<readonly GuildSuspensionRecord[]>;
}

/**
 * Raised by the dispatch path when a suspended guild's interaction arrives. The renderer maps its
 * name to the `GUILD_UNAVAILABLE` notice reason, so the user sees the formal notice frame rather
 * than a partial render — blueprint.md §22.2 + interface.md §3's reason-code table.
 */
export class GuildSuspendedError extends Error {
  constructor(readonly guildId: string) {
    super(`Guild "${guildId}" is suspended by a Power Engine control action`);
    this.name = 'GuildSuspendedError';
  }
}

export class InMemoryGuildSuspensionStore implements GuildSuspensionStore {
  private readonly records = new Map<string, GuildSuspensionRecord>();

  async suspend(record: GuildSuspensionRecord): Promise<void> {
    this.records.set(record.guildId, record);
  }

  async unsuspend(guildId: string): Promise<boolean> {
    return this.records.delete(guildId);
  }

  async isSuspended(guildId: string): Promise<boolean> {
    return this.records.has(guildId);
  }

  async list(): Promise<readonly GuildSuspensionRecord[]> {
    return [...this.records.values()];
  }
}

interface GuildSuspensionRow {
  guildId: string;
  suspendedBy: string;
  reason: string;
  suspendedAt: string | number;
}

export class PostgresGuildSuspensionStore implements GuildSuspensionStore {
  constructor(private readonly knex: Knex) {}

  async suspend(record: GuildSuspensionRecord): Promise<void> {
    await this.knex('guild_suspensions')
      .insert({
        guildId: record.guildId,
        suspendedBy: record.suspendedBy,
        reason: record.reason,
        suspendedAt: record.suspendedAt,
      })
      .onConflict('guildId')
      .merge();
  }

  async unsuspend(guildId: string): Promise<boolean> {
    const deleted = await this.knex('guild_suspensions').where({ guildId }).del();
    return deleted > 0;
  }

  async isSuspended(guildId: string): Promise<boolean> {
    const row = await this.knex('guild_suspensions').where({ guildId }).first();
    return row !== undefined;
  }

  async list(): Promise<readonly GuildSuspensionRecord[]> {
    const rows = (await this.knex('guild_suspensions').select('*')) as GuildSuspensionRow[];
    return rows.map((row) => ({
      guildId: row.guildId,
      suspendedBy: row.suspendedBy,
      reason: row.reason,
      suspendedAt: Number(row.suspendedAt),
    }));
  }
}
