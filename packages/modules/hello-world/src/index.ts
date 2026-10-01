export const MODULE_SLUG = 'hello-world';

export const MODULE_DESCRIPTION = 'Minimal reference module that exercises the Swastik promotion path.';

export type ModuleState = 'loading' | 'ready';

/** Minimal host-registry contract a promoted module may rely on (no framework import). */
interface CommandRegistryLike {
  register(def: {
    data: { name: string; description: string };
    execute: (interaction: unknown) => Promise<unknown>;
    moduleId: string;
  }): void;
}

let loads = 0;
let state: ModuleState = 'loading';

export function loadCount(): number {
  return loads;
}

export function currentState(): ModuleState {
  return state;
}

export function describe(): string {
  return state === 'ready' ? MODULE_DESCRIPTION : MODULE_DESCRIPTION + ' (loading)';
}

/**
 * Host-side registration surface (M2/MR-1). The framework invokes this at
 * MODULE_LOAD with its CommandRegistry; the module contributes its commands here.
 */
export function registerCommands(registry: CommandRegistryLike): void {
  registry.register({
    data: { name: 'hello', description: 'Hello-world reference command.' },
    execute: async () => ({ content: 'Hello from the hello-world module.' }),
    moduleId: MODULE_SLUG,
  });
}

export async function onLoad(): Promise<void> {
  loads += 1;
}

export async function onReady(): Promise<void> {
  state = 'ready';
}

export async function onUnload(): Promise<void> {
  state = 'loading';
}
