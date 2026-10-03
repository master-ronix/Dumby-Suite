import type { CommandDeclaration } from '@workspace/swastik';
import type { Container } from '../di/container.js';
import type { ModuleManifest } from './manifest.schema.js';

/** §5.9 — a module-declared BullMQ job processor (registered against its named queue). */
export interface ModuleJobDeclaration {
  readonly queueName: string;
  readonly process: (job: { data: unknown }) => Promise<void> | void;
}

/** §15.1 — a module-declared gateway event handler, registered with the `EventRouter`. */
export interface ModuleEventHandlerDeclaration {
  readonly event: string;
  readonly once?: boolean;
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
  /** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
  commands?: readonly CommandDeclaration[];
  /** §5.9 — the module's job processors; the loader registers their queues. */
  jobs?: readonly ModuleJobDeclaration[];
  /** §15.1 — the module's gateway event handlers; the loader registers them with the router. */
  events?: readonly ModuleEventHandlerDeclaration[];
  /** §29.6 — the module's cron tasks; the loader registers them with the scheduler. */
  tasks?: readonly ModuleTaskDeclaration[];
  onLoad?: (container: Container) => Promise<void> | void;
  onReady?: (container: Container) => Promise<void> | void;
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
