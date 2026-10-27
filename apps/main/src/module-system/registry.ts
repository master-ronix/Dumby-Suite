import type { CommandDeclaration } from '@workspace/swastik';
import type { Container } from '../di/container.js';
import type { ModuleManifest } from './manifest.schema.js';
import type { ModulePage } from '@workspace/swastik';

/** §5.9 — a module-declared BullMQ job processor (registered against its named queue). */
export interface ModuleJobDeclaration {
  readonly queueName: string;
  readonly process: (job: { data: unknown }) => Promise<void> | void;
}

/** §15.1 — a module-declared gateway event handler, registered with the `EventRouter`. */
export interface ModuleEventHandlerDeclaration {
  readonly event: string;
  readonly once?: boolean;
  /** §16 — mark a subscription whose dropped instances violate no correctness requirement. */
  readonly sheddable?: boolean;
  readonly handle: (...args: unknown[]) => Promise<void> | void;
}

/** §29.6 — a module-declared cron task, registered with the `Scheduler`. */
export interface ModuleTaskDeclaration {
  readonly name: string;
  readonly cron: string;
  readonly execute: () => Promise<void> | void;
}

export interface LoadedModule {
  manifest: ModuleManifest;
  /** UR-20261019-103 — the PLATFORM-ISSUED buildId for this module (Swastik), for the identity band. */
  buildId?: string;
  /**
   * UR-20261012-066 — the module's own directory inside the image.
   *
   * A module's visuals belong to the module (ADR-012's pattern: a declared UI field, with a framework
   * default). Resolving `ui.iconAsset` needs this root; without it the core can only reach the assets
   * it happens to carry itself, which is how the module logos ended up hardcoded in the core.
   */
  root?: string;
  /** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
  commands?: readonly CommandDeclaration[];
  /** §5.9 — the module's job processors; the loader registers their queues. */
  jobs?: readonly ModuleJobDeclaration[];
  /** §15.1 — the module's gateway event handlers; the loader registers them with the router. */
  events?: readonly ModuleEventHandlerDeclaration[];
  /** §29.6 — the module's cron tasks; the loader registers them with the scheduler. */
  tasks?: readonly ModuleTaskDeclaration[];
  /** UR-20261027-106 — the pages the MODULE owns; the loader registers them with the page registry. */
  pages?: readonly ModulePage[];
  onLoad?: (container: Container) => Promise<void> | void;
  onReady?: (container: Container) => Promise<void> | void;
  /** UR-20261012-071 — §11.7's DISABLED → ENABLED hook: start the module's active processes. */
  onEnable?: (container: Container) => Promise<void> | void;
  /** UR-20261012-071 — §11.7's ENABLED → DISABLED hook: stop them. Always before `onUnload`. */
  onDisable?: () => Promise<void> | void;
  /** UR-20261012-072 — §11.7: cleanup on an unrecoverable error (a load/ready failure). */
  onError?: (error: Error) => Promise<void> | void;
  /** UR-20261012-072 — §11.7: react to this module's per-guild config change, without a reload. */
  onConfigChange?: (
    guildId: string,
    config: Readonly<Record<string, unknown>>,
  ) => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
}

export class ModuleAlreadyRegisteredError extends Error {
  constructor(moduleName: string) {
    super(`Module "${moduleName}" is already registered`);
    this.name = 'ModuleAlreadyRegisteredError';
  }
}

export class ModuleRegistry {
  private readonly modules = new Map<string, LoadedModule>();

  register(module: LoadedModule): void {
    if (this.modules.has(module.manifest.name)) {
      throw new ModuleAlreadyRegisteredError(module.manifest.name);
    }
    this.modules.set(module.manifest.name, module);
  }

  get(name: string): LoadedModule | undefined {
    return this.modules.get(name);
  }

  all(): LoadedModule[] {
    return [...this.modules.values()];
  }

  has(name: string): boolean {
    return this.modules.has(name);
  }

  count(): number {
    return this.modules.size;
  }
}
