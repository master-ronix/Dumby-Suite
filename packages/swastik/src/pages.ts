/**
 * UR-20261027-106 — a module OWNS its page.
 *
 * The doctrine says a module is a self-contained vertical slice owning commands, events, services,
 * data and config. The tree did the opposite: every module declared a command that returned
 * `{ page, data }` and the host built the page in `apps/main/src/rendering/page-data.ts`. That file is
 * a core-base file serving seven modules, which makes "core module" a manifest label rather than a
 * code boundary.
 *
 * This is the contract that lets a module build its own page without importing the core base:
 *
 *   - the module declares the page and owns its composition (labels, sections, ordering);
 *   - the framework supplies the DATA through typed capability calls (operator decision, 2026-10-27):
 *     the module calls `read.installState(guildId)` and owns the page; the framework owns the query.
 *     A raw SQL handle was rejected — under the doctrine a module owns its own tables, and a
 *     framework read-model is the honest shape for a read that spans what the framework records.
 *
 * A page declared here wins over the host's built-in page of the same id, so a module can take over
 * its own surface without the host changing.
 */
export interface ModulePageContext {
  /** The guild the page is being rendered for; null in a DM. */
  readonly guildId: string | null;
  /** The Discord application answering — the main profile's, or a persona's. */
  readonly applicationId: string;
  /** `'main'`, or the persona's id. */
  readonly profileId: string;
  /** 1-based page index within the module's own pager. */
  readonly page: number;
}

/** A module as the read-model reports it — manifest facts only, no database row. */
export interface ModuleSummary {
  readonly slug: string;
  readonly tier: string;
  readonly description: string;
  readonly displayName?: string;
  readonly iconName?: string;
  readonly accent?: string;
  readonly commands: readonly {
    readonly name: string;
    readonly description: string;
  }[];
}

/**
 * The typed read-model the framework provides. It carries no handle and no table name: a module asks
 * for the fact it needs, and the framework decides how to answer it. Every method is scoped to the
 * guild and profile the page is being rendered for, so a module cannot read another guild's state by
 * passing a different id.
 */
export interface ModulePageReadModel {
  /** Every module the framework knows, in load order. */
  list(): Promise<readonly ModuleSummary[]>;
  /** Is this module enabled in the page's guild? Core and admin always are. */
  installState(slug: string): Promise<boolean>;
  /** When this module was installed in the page's guild, as epoch ms; `undefined` when it has no row. */
  installedAt(slug: string): Promise<number | undefined>;
  /** Does the page's profile hold this module in this guild? */
  ownedByCaller(slug: string): Promise<boolean>;
  /** The command names this guild actually resolves to, keyed by the declared name. */
  commandNames(): Promise<ReadonlyMap<string, string>>;
  /** The per-guild status of a declared command name. */
  commandStatus(name: string): Promise<'enabled' | 'disabled'>;
  /** The emoji name a module page uses as its command marker. */
  markerIcon(): Promise<string>;
  /**
   * The rendered reference for a declared `ui.icon`, as the application serving this page owns it —
   * `<:name:id>` — or the declared name itself when the application has not uploaded that emoji.
   *
   * A module names the icon; the framework resolves it. The emoji registry, the upload lifecycle and
   * the per-application ownership of an emoji all stay behind this call, which is why a page can
   * render an icon without touching the core base.
   */
  moduleIcon(iconName: string | undefined): Promise<string>;
  /** Reachability of the two shared subsystems, as the framework measured them for this render. */
  probe(): Promise<{ readonly database: SubsystemState; readonly redis: SubsystemState }>;
  /** The PROFILE this page reports for — her runtime, not the host's. */
  actingProfile(): Promise<ActingProfileFacts>;
  /** The modules this profile HOLDS in the page's guild — the ownership read, not what is loaded. */
  heldModules(): Promise<readonly string[]>;
  /**
   * The configured shard count. A narrow read on purpose: a general `setting(key)` would hand a module
   * the whole configuration surface, which is the boundary this contract exists to hold.
   */
  shardCount(): Promise<number>;
  /**
   * The guild and member counts this profile sees, and WHICH source answered. The Discord API is the
   * authority on membership; the cache is a snapshot taken at login and can lag, which is how a bot in
   * three guilds once reported four. A page must be able to say which it used.
   */
  guilds(): Promise<GuildCounts>;
  /**
   * The host process's own numbers. A module CANNOT read these itself: its tsconfig carries no Node
   * types, because a module is environment-neutral — it declares surfaces, it does not touch the host
   * runtime. So the framework reports them, and the page labels them as SHARED rather than the
   * profile's.
   */
  hostProcess(): Promise<HostProcessFacts>;
  /**
   * The pending command-queue actions for the page's guild, oldest first. The queue is core
   * infrastructure; a module asks what is pending, not how the table is shaped.
   */
  pendingQueue(): Promise<readonly PendingQueueEntry[]>;
  /**
   * WHO holds a module in this page's guild — `'main'`, a persona's id, or `undefined` when nobody
   * does. `undefined` is NOT the main bot: the ownership read answers `'main'` explicitly when the
   * resident bot holds it, and a page that conflated the two would name the bot as the holder of a
   * module it never claimed.
   */
  holder(slug: string): Promise<string | undefined>;
  /**
   * Is this module enabled by DEFAULT for the acting profile? Not the same as the guild's state: a
   * standard module is enabled by default only for the profile that got there first, so this answer
   * depends on ownership. Core and Admin are shared and always on; marketplace never defaults on.
   */
  enabledByDefault(slug: string): Promise<boolean>;
}

export type SubsystemState = 'connected' | 'unavailable';

export interface PendingQueueEntry {
  /** The command this action will apply to. */
  readonly commandKey: string;
  /** `'rename'` when the payload carries no action — the queue's own default. */
  readonly action: string;
  readonly newName?: string;
  readonly alias?: string;
  readonly disable?: boolean;
}

export interface HostProcessFacts {
  /** Seconds the process has been up. */
  readonly uptimeSeconds: number;
  /** e.g. `v20.20.2`. */
  readonly nodeVersion: string;
  readonly memory: {
    readonly rss: number;
    readonly heapUsed: number;
    readonly heapTotal: number;
  };
}

export interface GuildCounts {
  /** Guilds this profile is in. */
  readonly total: number;
  /** Members across them; `undefined` when the cache has not filled — not zero. */
  readonly members?: number;
  /** `'live'` when the API answered, `'cache'` when the snapshot did. */
  readonly source: 'live' | 'cache';
}

export interface ActingProfileFacts {
  /** `'main'`, or the persona's id. */
  readonly profileId: string;
  /** When this profile's runtime started, epoch ms; absent for the internal profile, the host. */
  readonly startedAt?: number;
  /** Is this profile's gateway connected? */
  readonly gatewayReady: boolean;
  /** Gateway latency in ms, when the client reports one. */
  readonly gatewayPingMs?: number;
  /** The module slugs this profile's runtime has LOADED — a different fact from what it holds. */
  readonly loadedModules: readonly string[];
}

export interface ModulePage {
  /** The page id the command returns. */
  readonly id: string;
  /** Build the page. The shape is the renderer's page data; the SDK keeps it opaque. */
  render(context: ModulePageContext, read: ModulePageReadModel): Promise<unknown>;
}

export function definePage(page: ModulePage): ModulePage {
  return page;
}
