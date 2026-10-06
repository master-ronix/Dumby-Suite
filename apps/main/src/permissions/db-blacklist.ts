import type { BlacklistLookup } from './resolver.js';

export interface BlockedUserRow {
  userId: string;
  guildId: string | null;
}

export type BlockedUsersLoader = () => Promise<ReadonlyArray<BlockedUserRow>>;

export interface DbBlacklistLookupOptions {
  loader: BlockedUsersLoader;
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
