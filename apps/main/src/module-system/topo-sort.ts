import { satisfiesRange } from '../licensing/semver.js';

export interface ModuleDependencyPin {
  readonly token: string;
  readonly version: string;
}

export interface ModuleProvision {
  readonly token: string;
  readonly contract: string;
}

export interface ModuleNode {
  name: string;
  version: string;
  /** `{ token, version }` pins — never bare tokens (§ module-anatomy-manifest). */
  depends: readonly ModuleDependencyPin[];
  /** The DI tokens this module publishes, which is what `depends` entries resolve against. */
  provides: readonly ModuleProvision[];
  required: boolean;
}

export class ModuleDependencyCycleError extends Error {
  constructor(readonly chain: readonly string[]) {
    super(`Module dependency cycle detected: ${chain.join(' -> ')}`);
    this.name = 'ModuleDependencyCycleError';
  }
}

export class UnknownModuleDependencyError extends Error {
  constructor(
    readonly moduleName: string,
    readonly missingDependency: string,
  ) {
    super(`Module "${moduleName}" depends on unknown module "${missingDependency}"`);
    this.name = 'UnknownModuleDependencyError';
  }
}

/**
 * A `depends` token that no loaded module provides, or one whose providing module's version does
 * not satisfy the pinned range. Stage 11 treats this as fatal, naming the token, the range, and the
 * version found.
 */
export class UnsatisfiedModuleDependencyError extends Error {
  constructor(
    readonly moduleName: string,
    readonly token: string,
    readonly range: string,
    readonly foundVersion: string | null,
  ) {
    super(
      foundVersion === null
        ? `Module "${moduleName}" depends on token "${token}" (${range}), but no loaded module provides it`
        : `Module "${moduleName}" depends on token "${token}" (${range}), but the providing module is version ${foundVersion}`,
    );
    this.name = 'UnsatisfiedModuleDependencyError';
  }
}

type VisitState = 'unvisited' | 'visiting' | 'done';

/** Resolves each `{ token, version }` pin to the name of the module that provides the token. */
function resolveEdges(modules: readonly ModuleNode[]): Map<string, string[]> {
  const providerOf = new Map<string, ModuleNode>();
  for (const m of modules) {
    for (const provided of m.provides) {
      if (!providerOf.has(provided.token)) providerOf.set(provided.token, m);
    }
  }

  const edges = new Map<string, string[]>();
  for (const m of modules) {
    const targets: string[] = [];
    for (const pin of m.depends) {
      const provider = providerOf.get(pin.token);
      if (provider === undefined) {
        throw new UnsatisfiedModuleDependencyError(m.name, pin.token, pin.version, null);
      }
      if (!satisfiesRange(pin.version, provider.version)) {
        throw new UnsatisfiedModuleDependencyError(
          m.name,
          pin.token,
          pin.version,
          provider.version,
        );
      }
      targets.push(provider.name);
    }
    edges.set(m.name, targets);
  }
  return edges;
}

export function topologicalLoadOrder(modules: readonly ModuleNode[]): string[] {
  const byName = new Map(modules.map((m) => [m.name, m] as const));
  const edges = resolveEdges(modules);

  const state = new Map<string, VisitState>(modules.map((m) => [m.name, 'unvisited'] as const));
  const order: string[] = [];
  const stack: string[] = [];

  function visit(name: string): void {
    const current = state.get(name);
    if (current === 'done') return;
    if (current === 'visiting') {
      const cycleStart = stack.indexOf(name);
      throw new ModuleDependencyCycleError([...stack.slice(cycleStart), name]);
    }
    state.set(name, 'visiting');
    stack.push(name);
    for (const target of edges.get(name) ?? []) visit(target);
    stack.pop();
    state.set(name, 'done');
    order.push(name);
  }

  for (const m of modules) visit(m.name);
  void byName;
  return order;
}

export interface LoadFailureClassification {
  fatal: string[];
  degraded: string[];
}

export function classifyLoadFailures(
  modules: readonly ModuleNode[],
  failedModuleNames: readonly string[],
): LoadFailureClassification {
  const byName = new Map(modules.map((m) => [m.name, m] as const));
  const fatal: string[] = [];
  const degraded: string[] = [];
  for (const name of failedModuleNames) {
    const mod = byName.get(name);
    if (!mod) continue;
    (mod.required ? fatal : degraded).push(name);
  }
  return { fatal, degraded };
}
