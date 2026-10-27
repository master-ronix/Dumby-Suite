import type {
  ActingProfileFacts,
  GuildCounts,
  ModulePageReadModel,
  ModuleSummary,
  SubsystemState,
} from '@workspace/swastik';

/**
 * UR-20261027-106 — the host side of the module page contract.
 *
 * A module that owns its page asks for facts through `ModulePageReadModel` (operator decision,
 * 2026-10-27): the module owns the composition, the framework owns the query. This adapter answers
 * those calls from the sources the host already trusts, and it deliberately takes every source as an
 * injected function rather than reaching for the container — so it is testable on its own, and so the
 * page layer keeps exactly one place that knows where a fact comes from.
 *
 * Scope is fixed at construction: the guild and profile the page is being rendered for. A module
 * cannot ask about another guild, because it has no way to name one.
 */
export interface PageReadModelSources {
  /** Every module the framework knows, in load order. */
  readonly listModules: () => readonly {
    readonly name: string;
    readonly tier: string;
    readonly description: string;
    readonly ui?: {
      readonly displayName?: string;
      readonly icon?: string;
      readonly accent?: string;
    };
    readonly commands: readonly { readonly name: string; readonly description: string }[];
  }[];
  /** Is this module enabled in the page's guild? */
  readonly isEnabled: (slug: string) => Promise<boolean>;
  /** Epoch ms this module was installed in the page's guild, or undefined when it has no row. */
  readonly installedAt: (slug: string) => Promise<number | undefined>;
  /** Does the page's profile hold this module in this guild? */
  readonly ownedByCaller: (slug: string) => Promise<boolean>;
  /** The command names this guild resolves to, keyed by declared name. */
  readonly commandNames: () => Promise<ReadonlyMap<string, string>>;
  /** The per-guild status of one declared command name. */
  readonly commandStatus: (name: string) => Promise<'enabled' | 'disabled'>;
  /** The emoji name a module page uses as its command marker. */
  readonly markerIcon: () => Promise<string>;
  /** The rendered reference for a declared `ui.icon`, resolved for the application serving the page. */
  readonly moduleIcon: (iconName: string | undefined) => string;
  /** Reachability of the two shared subsystems, as the framework measured it. */
  readonly probe: () => Promise<{ database: SubsystemState; redis: SubsystemState }>;
  /** The profile this page reports for — her runtime, not the host's. */
  readonly actingProfile: () => ActingProfileFacts;
  /** The modules this profile holds in the page's guild. */
  readonly heldModules: () => Promise<readonly string[]>;
  /** The configured shard count — narrow on purpose. */
  readonly shardCount: () => number;
  /** Guild and member counts, and which source answered. */
  readonly guilds: () => Promise<GuildCounts>;
}

export function makePageReadModel(sources: PageReadModelSources): ModulePageReadModel {
  return {
    async list(): Promise<readonly ModuleSummary[]> {
      return sources.listModules().map((module) => ({
        slug: module.name,
        tier: module.tier,
        description: module.description,
        ...(module.ui?.displayName !== undefined ? { displayName: module.ui.displayName } : {}),
        ...(module.ui?.icon !== undefined ? { iconName: module.ui.icon } : {}),
        ...(module.ui?.accent !== undefined ? { accent: module.ui.accent } : {}),
        commands: module.commands.map((command) => ({
          name: command.name,
          description: command.description,
        })),
      }));
    },
    installState: (slug) => sources.isEnabled(slug),
    installedAt: (slug) => sources.installedAt(slug),
    ownedByCaller: (slug) => sources.ownedByCaller(slug),
    commandNames: () => sources.commandNames(),
    commandStatus: (name) => sources.commandStatus(name),
    markerIcon: () => sources.markerIcon(),
    async moduleIcon(iconName) {
      return sources.moduleIcon(iconName);
    },
    probe: () => sources.probe(),
    async actingProfile() {
      return sources.actingProfile();
    },
    heldModules: () => sources.heldModules(),
    async shardCount() {
      return sources.shardCount();
    },
    guilds: () => sources.guilds(),
  };
}
