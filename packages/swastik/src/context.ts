import type { ExecutionIdentity, ModuleStanding } from './commands.js';

/**
 * UR-20261012-070 — the module EXECUTION CONTEXT, for entry points that are not a command.
 *
 * UR-20261012-067 gave a command an `identity` and a `module` standing, because a command has an
 * interaction to carry them. A module's other entry points do not: a gateway event handler receives
 * Discord's own arguments, a job processor receives its payload, and a cron task receives nothing at
 * all. So the same question — *which profile is running this, and where* — had no answer on three of
 * the four paths, and the answer is exactly what a module needs to behave correctly when the main bot
 * and a persona both run it in different guilds.
 *
 * Passing a context as a parameter was rejected for the event path: a handler already receives a
 * variable argument list, so an appended context is invisible to a rest parameter and a prepended one
 * silently breaks every existing handler. The context is therefore carried out-of-band — but the SDK
 * stays environment-neutral (no Node builtins, no `@types/node`), so the CARRIER is installed by the
 * host and the SDK only declares the shape. See `ModuleContextStore`.
 *
 * ```ts
 * const context = currentModuleContext();
 * if (context?.standing.ownedByCaller) {
 *   // this profile holds the module in this guild
 * }
 * ```
 */
export type ModuleEntryPoint = 'command' | 'event' | 'job' | 'task';

export interface ModuleExecutionContext {
  /** The module this work belongs to. */
  readonly moduleId: string;
  /** Which of the four paths is running it. */
  readonly source: ModuleEntryPoint;
  /** Who is running it and where — the same shape a command receives. */
  readonly identity: ExecutionIdentity;
  /** This module's own standing in that guild — the same shape a command receives. */
  readonly standing: ModuleStanding;
}

/**
 * The carrier. The host installs an implementation (the app uses `AsyncLocalStorage`, so the context
 * propagates through awaits and callbacks); the SDK never depends on one, which is what keeps this
 * package free of Node builtins.
 */
export interface ModuleContextStore {
  get(): ModuleExecutionContext | undefined;
  run<T>(context: ModuleExecutionContext, fn: () => T): T;
}

let store: ModuleContextStore | undefined;

/** Install the carrier. Called once by the host at boot. */
export function installModuleContextStore(next: ModuleContextStore): void {
  store = next;
}

/**
 * Run `fn` with the module context attached. The HOST calls this, once per entry point; a module
 * never calls it. With no store installed this is a plain call, so the framework behaves exactly as
 * it did before.
 */
export function runWithModuleContext<T>(context: ModuleExecutionContext, fn: () => T): T {
  return store === undefined ? fn() : store.run(context, fn);
}

/** The context of the work currently running, or `undefined` outside a module entry point. */
export function currentModuleContext(): ModuleExecutionContext | undefined {
  return store?.get();
}

/**
 * The context, or a throw naming the reason. For a module whose logic is meaningless without knowing
 * whose signal it is answering — better a loud failure than a silent guess at the wrong guild.
 */
export function requireModuleContext(): ModuleExecutionContext {
  const context = store?.get();
  if (context === undefined) {
    throw new Error(
      'No module execution context is active. This work is not running inside a module entry point, ' +
        'so the framework cannot say which profile is running it or where.',
    );
  }
  return context;
}
