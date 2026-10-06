/**
 * Module tier rules (Cluster: Ring). Validated against a manifest at
 * bootstrap Stage 11 (MODULE_VALIDATE) before any module is loaded.
 */

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

/**
 * change-log v4.1.0 resolution: a guild with no row in guild_module_states
 * defaults to the module tier default — active for everything except
 * Marketplace (opt-in per guild, "never_installed" until explicitly enabled).
 * Unknown/missing tiers default to Marketplace to fail closed.
 */
export function defaultEnabledForTier(tier: ModuleTier): boolean {
  return tier !== 'marketplace';
}
