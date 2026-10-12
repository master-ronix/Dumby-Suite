export type ModuleTier = 'admin' | 'core' | 'standard' | 'marketplace';

export interface ManifestCommandLike {
  name: string;
  rbacRequirement?: string | null | undefined;
}

export interface ModuleManifestForTierCheck {
  name: string;
  tier: ModuleTier;
  devGuildOnly?: boolean | undefined;
  marketplaceCategory?: string | null | undefined;
  commands?: readonly ManifestCommandLike[] | undefined;
}

export interface TierViolation {
  rule: string;
  message: string;
}

export function validateTierRules(manifest: ModuleManifestForTierCheck): TierViolation[] {
  const violations: TierViolation[] = [];

  if (manifest.tier === 'admin' && manifest.devGuildOnly !== true) {
    violations.push({
      rule: 'admin.devGuildOnly',
      message: `Admin-tier module "${manifest.name}" must set devGuildOnly: true`,
    });
  }

  if (manifest.tier === 'marketplace' && !manifest.marketplaceCategory) {
    violations.push({
      rule: 'marketplace.category',
      message: `Marketplace-tier module "${manifest.name}" must declare a marketplaceCategory`,
    });
  }

  if (manifest.tier !== 'marketplace' && manifest.marketplaceCategory != null) {
    violations.push({
      rule: 'marketplace.category.forbidden',
      message: `marketplaceCategory is forbidden for tier "${manifest.tier}" (module "${manifest.name}") — only Marketplace-tier modules may declare one`,
    });
  }

  if (manifest.tier === 'core') {
    for (const cmd of manifest.commands ?? []) {
      if (cmd.rbacRequirement) {
        violations.push({
          rule: 'core.noRbac',
          message: `Core-tier command "${manifest.name}.${cmd.name}" cannot declare an RBAC requirement (Core is RBAC-exempt)`,
        });
      }
    }
  }

  if (manifest.tier !== 'admin' && manifest.devGuildOnly === true) {
    violations.push({
      rule: 'devGuildOnly.adminOnly',
      message: `Only Admin-tier modules may set devGuildOnly: true (module "${manifest.name}" is tier "${manifest.tier}")`,
    });
  }

  return violations;
}

export function isTierValid(manifest: ModuleManifestForTierCheck): boolean {
  return validateTierRules(manifest).length === 0;
}

export function defaultEnabledForTier(tier: ModuleTier): boolean {
  return tier !== 'marketplace';
}

/**
 * UR-20261012-046 — the ONE enablement rule, shared by the dispatch path and the page data.
 *
 * These two paths disagreed, and the disagreement was a live defect. `page-data.ts` filters a
 * listing with `if (tier === 'core') return true`, but the router's `isModuleEnabledInGuild` read the
 * per-guild row alone — so a stale `enabled:false` row for a CORE module denied its command. That is
 * the reported failure: `/dashboard` returning "not available in guild 1062427177326497863".
 *
 * §13.2 settles the intent: a core module is never uninstallable, so it can never be disabled. The
 * row is an override for a module that CAN be turned off; for core there is nothing to override.
 * Returning `true` without consulting the row is therefore correct, not a shortcut — and it makes the
 * stale row inert rather than fatal.
 *
 * `row === undefined` keeps the tier default, so an unconfigured standard module stays enabled and a
 * marketplace module stays absent until installed.
 */
export function resolveModuleEnabled(
  tier: ModuleTier,
  row: { readonly enabled: boolean; readonly state: string } | undefined,
): boolean {
  if (tier === 'core') return true;
  if (row === undefined) return defaultEnabledForTier(tier);
  return row.enabled === true && row.state === 'active';
}
