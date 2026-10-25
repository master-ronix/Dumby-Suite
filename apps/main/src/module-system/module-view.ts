import type { ModuleRegistry } from './registry.js';

/**
 * THE ONE DERIVATION OF A MODULE'S STATE FOR A PROFILE IN A GUILD.
 *
 * Every surface — /browse, /modules, /dashboard, /health — and the command registration each computed
 * this for themselves, from overlapping reads. They agreed on the database and disagreed with each
 * other: a module listed on one page and absent on another, a command answering on the profile that did
 * not hold it, a count that moved the wrong way. Those are not four bugs; they are one bug wearing four
 * faces, and the fix is that there is nothing left to disagree about.
 *
 * The database rows were never wrong. `module-state` at boot reported `enabledBy`, `binding` and
 * `resolvedOwner` all equal, `agrees: true`, while the surfaces around them disagreed. So this file
 * derives every answer ONCE, from those rows, and everything else consumes it.
 *
 * It answers four questions, and no surface should answer any of them itself:
 *
 *   enabled          is the module ON in this guild?
 *   heldByMe         does THIS profile hold it?
 *   availableToMe    may THIS profile install it?
 *   registeredForMe  should THIS profile's runtime serve its commands?
 *
 * `registeredForMe` is the one the command registration needs, and it is the one that was missing:
 * a module enabled in a guild was registered by whoever asked, rather than by its holder.
 */
export interface ModuleView {
  readonly moduleId: string;
  readonly displayName: string;
  readonly tier: string;
  /** The guild's state row, raw. `null` when there is no row. */
  readonly state: {
    readonly enabled: boolean;
    readonly state: string;
    readonly enabledBy: string | undefined;
  } | null;
  /** The live binding, raw. */
  readonly binding: string | undefined;
  /**
   * Who holds it, by the ONE ownership read every surface must agree on:
   * a profile id, `'main'`, `'shared'` (a global tier), or `'none'` (disabled, held by nobody).
   */
  readonly owner: string;
  readonly enabled: boolean;
  readonly heldByMe: boolean;
  readonly availableToMe: boolean;
  readonly registeredForMe: boolean;
}

export interface ModuleViewDeps {
  moduleRegistry: ModuleRegistry;
  /** The guild's row for a module: `enabled`, `state`, `enabledBy`. */
  stateForGuild: (
    guildId: string,
    moduleId: string,
  ) => Promise<{ enabled: boolean; state: string; enabledBy?: string } | undefined>;
  /** The live binding's claimant, or undefined. */
  bindingForGuild: (guildId: string, moduleId: string) => Promise<string | undefined>;
  /** The ownership read — `resolveCommandOwner`. */
  resolveOwner: (guildId: string, moduleId: string) => Promise<string | undefined>;
  /** The tier default, so an untouched module answers the same way everywhere. */
  defaultEnabledForTier: (tier: string) => boolean;
  /** The tiers that are global: nobody holds them, and they are always on. */
  isSharedTier: (tier: string) => boolean;
  /** The tiers a profile can hold: standard and marketplace. */
  isGuildScopedTier: (tier: string) => boolean;
}

export interface ModuleViewService {
  /** Every module's view for one profile in one guild. */
  viewForGuild(guildId: string | null, profileId: string): Promise<readonly ModuleView[]>;
  /** One module's view, or undefined if the module is not registered. */
  viewForModule(
    guildId: string | null,
    moduleId: string,
    profileId: string,
  ): Promise<ModuleView | undefined>;
}

/** The internal profile's identity in the ownership read. */
const MAIN = 'main';
/** A global tier's identity: held by nobody in particular. */
const SHARED = 'shared';

export function makeModuleView(deps: ModuleViewDeps): ModuleViewService {
  const {
    moduleRegistry,
    stateForGuild,
    bindingForGuild,
    resolveOwner,
    defaultEnabledForTier,
    isSharedTier,
    isGuildScopedTier,
  } = deps;

  const viewForModule = async (
    guildId: string | null,
    moduleId: string,
    profileId: string,
  ): Promise<ModuleView | undefined> => {
    const entry = moduleRegistry.get(moduleId);
    if (entry === undefined) return undefined;
    const tier = entry.manifest.tier;
    const displayName = entry.manifest.ui?.displayName ?? moduleId;

    // A DM has no module state: nothing is enabled, nothing is held, nothing is registered.
    if (guildId === null || guildId === '') {
      return {
        moduleId,
        displayName,
        tier,
        state: null,
        binding: undefined,
        owner: isSharedTier(tier) ? SHARED : 'none',
        enabled: isSharedTier(tier),
        heldByMe: isSharedTier(tier),
        availableToMe: false,
        registeredForMe: isSharedTier(tier),
      };
    }

    const row = await stateForGuild(guildId, moduleId);
    const state =
      row === undefined
        ? null
        : {
            enabled: row.enabled === true,
            state: row.state,
            enabledBy: row.enabledBy === '' ? undefined : row.enabledBy,
          };

    // ENABLED — the shared tiers are on without reading a row; otherwise the row decides, and no row
    // means the tier's default. Exactly the rule the router and the page data already shared.
    const enabled = isSharedTier(tier)
      ? true
      : row === undefined
        ? defaultEnabledForTier(tier)
        : row.enabled === true && row.state === 'active';

    // OWNER — the same read, so a surface cannot answer differently.
    const owner = isSharedTier(tier) ? SHARED : ((await resolveOwner(guildId, moduleId)) ?? 'none');

    const binding = await bindingForGuild(guildId, moduleId);
    const me = profileId === '' ? MAIN : profileId;

    // HELD — a shared tier is held by everyone; a guild-scoped module by its owner, and only then.
    const heldByMe = isSharedTier(tier) ? true : owner === me;

    // AVAILABLE — installable only when the module is a guild-scoped one that NOBODY holds, and this
    // profile is not already holding it.
    //
    // An untouched standard module is ENABLED by the tier default, so ownership answers `'main'` for it
    // — and that is the operator's rule: whichever profile is in the guild first holds the standard
    // modules. A persona therefore may NOT take an untouched standard module; it has to be released
    // first. Treating `'main'` as available-to-anyone would let her install over the internal profile,
    // which is the migration this whole area keeps producing.
    const availableToMe = isGuildScopedTier(tier) && !heldByMe && owner === 'none';

    // REGISTERED — a shared tier always; a guild-scoped module for its HOLDER, whether or not it is
    // enabled.
    //
    // "Only while enabled" was wrong, and the symptom was exact: disabling a module made its command
    // report UNKNOWN_COMMAND ("not registered or not available here") instead of MODULE_DISABLED ("the
    // module that provides this command is switched off"). Dropping the command from the registry
    // removed the router's ability to say the useful thing. Keeping it registered — and letting the
    // router refuse it with MODULE_DISABLED — is the behaviour a member should see.
    const registeredForMe = isSharedTier(tier) ? true : owner === me;

    return {
      moduleId,
      displayName,
      tier,
      state,
      binding,
      owner,
      enabled,
      heldByMe,
      availableToMe,
      registeredForMe,
    };
  };

  const viewForGuild = async (
    guildId: string | null,
    profileId: string,
  ): Promise<readonly ModuleView[]> => {
    const views: ModuleView[] = [];
    for (const entry of moduleRegistry.all()) {
      const view = await viewForModule(guildId, entry.manifest.name, profileId);
      if (view !== undefined) views.push(view);
    }
    return views;
  };

  return { viewForGuild, viewForModule };
}

/** The modules a profile's runtime should serve, in registry order. */
export function registeredModuleIds(views: readonly ModuleView[]): readonly string[] {
  return views.filter((view) => view.registeredForMe).map((view) => view.moduleId);
}
