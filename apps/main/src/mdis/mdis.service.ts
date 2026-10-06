import type { ModuleRegistry } from '../module-system/registry.js';

/**
 * Appendix C #18 — the MDIS (Module Distribution/Installation Service) surface. It exposes the
 * installed module fleet as a REST catalog and drives per-guild install/uninstall, delegating
 * state changes to a store (the `guild_module_states` table at runtime).
 */
export interface CatalogEntry {
  readonly slug: string;
  readonly tier: string;
  readonly version: string;
  readonly description: string;
  readonly visibility: string;
}

export interface ModuleInstallStore {
  listActive(guildId: string): Promise<string[]>;
  install(guildId: string, slug: string): Promise<void>;
  uninstall(guildId: string, slug: string): Promise<void>;
}

export class UnknownModuleError extends Error {
  constructor(readonly slug: string) {
    super(`unknown module: ${slug}`);
    this.name = 'UnknownModuleError';
  }
}

export class MdisService {
  constructor(
    private readonly registry: ModuleRegistry,
    private readonly store: ModuleInstallStore,
  ) {}

  catalog(): CatalogEntry[] {
    return this.registry
      .all()
      .map((m) => m.manifest)
      .filter((m) => m.visibility !== 'private')
      .map((m) => ({
        slug: m.name,
        tier: m.tier,
        version: m.version,
        description: m.description,
        visibility: m.visibility,
      }));
  }

  getModule(slug: string): CatalogEntry | undefined {
    return this.catalog().find((entry) => entry.slug === slug);
  }

  installed(guildId: string): Promise<string[]> {
    return this.store.listActive(guildId);
  }

  async install(guildId: string, slug: string): Promise<void> {
    if (!this.registry.has(slug)) throw new UnknownModuleError(slug);
    await this.store.install(guildId, slug);
  }

  async uninstall(guildId: string, slug: string): Promise<void> {
    await this.store.uninstall(guildId, slug);
  }
}
