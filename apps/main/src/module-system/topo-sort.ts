export interface ModuleNode {
  name: string;
  depends: readonly string[];
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

type VisitState = 'unvisited' | 'visiting' | 'done';

export function topologicalLoadOrder(modules: readonly ModuleNode[]): string[] {
  const byName = new Map(modules.map((m) => [m.name, m] as const));

  for (const m of modules) {
    for (const dep of m.depends) {
      if (!byName.has(dep)) throw new UnknownModuleDependencyError(m.name, dep);
    }
  }

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
    const node = byName.get(name);
    if (node) {
      for (const dep of node.depends) visit(dep);
    }
    stack.pop();
    state.set(name, 'done');
    order.push(name);
  }

  for (const m of modules) visit(m.name);
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
