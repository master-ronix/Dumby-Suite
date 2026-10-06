/**
 * CL-0045 / UR-A-07 — Layer 2 `BlacklistLookup` backed by the `blocked_users`
 * table with a TTL cache.
 *
 * The resolver interface (`BlacklistLookup`) is synchronous by design so the
 * seven-layer chain stays a pure function of its context; persistence happens
 * through this LOG slice. A full-table snapshot is loaded on demand and kept
 * for the `user:blacklist` TTL (120 s, see `cache/key-namespace.ts`), then
 * lazily refreshed the next time a stale read is requested.
 *
 * Reads are served from the in-memory snapshot — never from a synchronous
 * query — while `refreshIfStale()` is awaited by the dispatcher before the
 * permission chain is evaluated.
 */
import type { BlacklistLookup } from './resolver.js';

export interface BlockedUserRow {
  userId: string;
  guildId: string | null;
}

export type BlockedUsersLoader = () => Promise<ReadonlyArray<BlockedUserRow>>;

export interface DbBlacklistLookupOptions {
  /** Reads all non-deleted `blocked_users` rows (guildId null = global). */
  loader: BlockedUsersLoader;
  /** Cache lifetime in milliseconds; defaults to the 120 s `user:blacklist` TTL. */
  ttlMs?: number;
}

export interface BlacklistLookupProvider {
  refreshIfStale(): Promise<void>;
}

export class DbBlacklistLookup implements BlacklistLookup {
  private readonly ttlMs: number;
  private global = new Set<string>();
  private guilds = new Map<string, Set<string>>();
  private cachedAt = 0;
  private refreshing: Promise<void> | null = null;

  constructor(private readonly options: DbBlacklistLookupOptions) {
    this.ttlMs = options.ttlMs ?? 120_000;
  }

  isGloballyBlacklisted(userId: string): boolean {
    return this.global.has(userId);
  }

  isGuildBlacklisted(userId: string, guildId: string): boolean {
    return this.guilds.get(guildId)?.has(userId) ?? false;
  }

  /** Loads the snapshot immediately (called once at bootstrap). */
  async prime(): Promise<void> {
    await this.load();
  }

  async refreshIfStale(): Promise<void> {
    if (Date.now() - this.cachedAt <= this.ttlMs) return;
    if (this.refreshing) {
      await this.refreshing;
      return;
    }
    this.refreshing = this.load();
    try {
      await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

  private async load(): Promise<void> {
    const rows = await this.options.loader();
    const global = new Set<string>();
    const guilds = new Map<string, Set<string>>();
    for (const row of rows) {
      if (row.guildId === null) {
        global.add(row.userId);
      } else {
        const members = guilds.get(row.guildId) ?? new Set<string>();
        members.add(row.userId);
        guilds.set(row.guildId, members);
      }
    }
    this.global = global;
    this.guilds = guilds;
    this.cachedAt = Date.now();
  }
}
