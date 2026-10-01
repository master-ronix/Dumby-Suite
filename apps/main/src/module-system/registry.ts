import type { Container } from '../di/container.js';
import type { CommandRegistry } from '../commands/command-registry.js';
import type { ModuleManifest } from './manifest.schema.js';

export interface LoadedModule {
  manifest: ModuleManifest;
  onLoad?: (container: Container) => Promise<void> | void;
  onReady?: (container: Container) => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  /**
   * The module-facing command-registration surface. A module hands its
   * `CommandDefinition`s to the host registry through this hook; the host owns
   * the registry, so a promoted (out-of-process) module can contribute commands
   * without reaching a container token. Declared commands in the manifest are
   * the author-side declaration; this hook is the host-side mechanism.
   */
  registerCommands?: (registry: CommandRegistry) => Promise<void> | void;
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
