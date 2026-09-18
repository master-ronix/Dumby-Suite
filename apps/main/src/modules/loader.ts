import type { Container } from '../di/container.js';
import type { Logger } from '../logging/logger.js';
import { topologicalLoadOrder, classifyLoadFailures, type ModuleNode } from './topo-sort.js';
import { validateTierRules } from './tier-rules.js';
import type { ModuleRegistry } from './registry.js';
import { CORE_TOKENS } from '../di/tokens.js';
import type { CommandRegistry } from '../commands/command-registry.js';

export interface ModuleLoadReport {
  order: readonly string[];
  fatal: readonly string[];
  degraded: readonly string[];
}

export interface ModuleReadyReport {
  failed: readonly string[];
  requiredFailed: readonly string[];
}

export class ModuleValidationFailedError extends Error {
  constructor(
    readonly moduleName: string,
    readonly violations: readonly string[],
  ) {
    super(`Module "${moduleName}" fails tier validation: ${violations.join('; ')}`);
    this.name = 'ModuleValidationFailedError';
  }
}

export class FatalModuleLoadError extends Error {
  constructor(readonly fatalModules: readonly string[]) {
    super(`Fatal (required:true) module load failure(s): ${fatalModules.join(', ')}`);
    this.name = 'FatalModuleLoadError';
  }
}

/**
 * Orchestrates bootstrap Stages 11-12 (MODULE_VALIDATE, MODULE_LOAD) and
 * Stage 17 (MODULE_READY), plus the reverse-order unload used in shutdown
 * step 3. The ordering/cycle-detection and tier-rule logic underneath is
 * already covered by tests/unit/topo-sort.test.ts and
 * tests/unit/tier-rules.test.ts.
 */
export class ModuleLoader {
  constructor(
    private readonly registry: ModuleRegistry,
    private readonly container: Container,
    private readonly logger: Logger,
  ) {}

  /** Stage 11: MODULE_VALIDATE. Throws on the first tier violation found. */
  validateAll(): void {
    for (const mod of this.registry.all()) {
      const violations = validateTierRules({
        name: mod.manifest.name,
        tier: mod.manifest.tier,
        devGuildOnly: mod.manifest.devGuildOnly,
        marketplaceCategory: mod.manifest.marketplaceCategory,
        commands: mod.manifest.commands,
      });
      if (violations.length > 0) {
        throw new ModuleValidationFailedError(
          mod.manifest.name,
          violations.map((v) => v.message),
        );
      }
    }
  }

  private nodes(): ModuleNode[] {
    return this.registry.all().map((m) => ({
      name: m.manifest.name,
      depends: m.manifest.depends,
      required: m.manifest.required,
    }));
  }

  /** Stage 12: MODULE_LOAD. Required-module failures are fatal; optional-module failures degrade that module only. */
  async loadAll(): Promise<ModuleLoadReport> {
    const nodes = this.nodes();
    const order = topologicalLoadOrder(nodes);

    const failed: string[] = [];
    for (const name of order) {
      const mod = this.registry.get(name);
      if (!mod) continue;
      try {
        this.container
          .tryResolve<CommandRegistry>(CORE_TOKENS.CommandRegistry)
          ?.registerModule(mod.manifest.name, mod.manifest.tier);
        await mod.onLoad?.(this.container);
      } catch (err) {
        this.logger.error('module-load-failed', { module: name, error: String(err) });
        failed.push(name);
      }
    }

    const { fatal, degraded } = classifyLoadFailures(nodes, failed);
    if (fatal.length > 0) {
      throw new FatalModuleLoadError(fatal);
    }
    return { order, fatal, degraded };
  }

  /**
   * Stage 17: MODULE_READY. onReady failures do not crash bootstrap, but
   * required-module failures must keep readiness false until remediated.
   */
  async readyAll(order: readonly string[]): Promise<ModuleReadyReport> {
    const readyFailures: string[] = [];
    for (const name of order) {
      const mod = this.registry.get(name);
      if (!mod) continue;
      try {
        await mod.onReady?.(this.container);
      } catch (err) {
        this.logger.error('module-ready-failed-non-fatal', { module: name, error: String(err) });
        readyFailures.push(name);
      }
    }
    return {
      failed: readyFailures,
      requiredFailed: readyFailures.filter((name) => this.registry.get(name)?.manifest.required),
    };
  }

  /** Shutdown step 3: onUnload in reverse load order. */
  async unloadAll(order: readonly string[]): Promise<void> {
    for (const name of [...order].reverse()) {
      const mod = this.registry.get(name);
      if (!mod) continue;
      try {
        await mod.onUnload?.();
      } catch (err) {
        this.logger.error('module-unload-failed', { module: name, error: String(err) });
      }
    }
  }
}
