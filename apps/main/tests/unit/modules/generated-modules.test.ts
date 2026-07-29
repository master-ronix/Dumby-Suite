import { test, expect } from 'vitest';
import { MODULES, type ModuleSpec } from '../../../scripts/scaffold-module.js';
import { validateTierRules } from '../../../src/modules/tier-rules.js';
import { topologicalLoadOrder, type ModuleNode } from '../../../src/modules/topo-sort.js';

// Use import.meta.glob so Vite can statically analyze the module graph —
// variable template-literal dynamic imports are not supported by Vite.
const allServices = import.meta.glob('../../../src/modules/*/service.ts');
const allManifests = import.meta.glob('../../../src/modules/*/manifest.ts');

function pascalCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

interface SelfTestRunRecord {
  id: string;
  status: 'pass' | 'fail';
  details: Record<string, unknown>;
  ranAt: string;
}

class FakeRepository {
  runs: SelfTestRunRecord[] = [];
  async recordRun(status: 'pass' | 'fail', details: Record<string, unknown>): Promise<SelfTestRunRecord> {
    const record = { id: `fake-${this.runs.length}`, status, details, ranAt: new Date().toISOString() };
    this.runs.push(record);
    return record;
  }
  async countRuns(): Promise<number> {
    return this.runs.length;
  }
}

class FakeEventBus {
  emitted: Array<{ eventName: string; payload: unknown }> = [];
  async emit(eventName: string, payload: unknown): Promise<void> {
    this.emitted.push({ eventName, payload });
  }
}

for (const spec of MODULES) {
  const name = pascalCase(spec.slug);

  test(`[${spec.slug}] service.selfTest() records a run and emits the manifest's declared event`, async () => {
    const serviceKey = `../../../src/modules/${spec.slug}/service.ts`;
    const serviceLoader = allServices[serviceKey];
    if (!serviceLoader) throw new Error(`No service glob match for key: ${serviceKey}`);
    const serviceModule = (await serviceLoader()) as Record<string, unknown>;
    const ServiceClass = serviceModule[`${name}Service`] as new (
      repo: FakeRepository,
      bus?: FakeEventBus,
    ) => { selfTest: () => Promise<{ ok: boolean; moduleSlug: string }>; status: () => Promise<{ totalRuns: number }> };

    const repo = new FakeRepository();
    const bus = new FakeEventBus();
    const service = new ServiceClass(repo, bus);

    const result = await service.selfTest();
    expect(result.ok).toBe(true);
    expect(result.moduleSlug).toBe(spec.slug);
    expect(repo.runs.length).toBe(1);
    expect(bus.emitted.length).toBe(1);
    expect(bus.emitted[0]?.eventName).toBe(`${spec.slug}.selftest.executed`);

    const status = await service.status();
    expect(status.totalRuns).toBe(1);
  });

  test(`[${spec.slug}] manifest passes the real tier-rule validator`, async () => {
    const manifestKey = `../../../src/modules/${spec.slug}/manifest.ts`;
    const manifestLoader = allManifests[manifestKey];
    if (!manifestLoader) throw new Error(`No manifest glob match for key: ${manifestKey}`);
    const manifestModule = (await manifestLoader()) as Record<string, unknown>;
    const manifest = manifestModule[`${name}Manifest`] as {
      name: string;
      tier: 'admin' | 'core' | 'standard' | 'marketplace';
      devGuildOnly?: boolean;
      marketplaceCategory?: string;
      commands: unknown[];
    };
    const violations = validateTierRules(manifest);
    expect(violations).toStrictEqual([]);
  });

  test(`[${spec.slug}] manifest event name matches {domain}.{entity}.{action}`, async () => {
    const manifestKey = `../../../src/modules/${spec.slug}/manifest.ts`;
    const manifestLoader = allManifests[manifestKey];
    if (!manifestLoader) throw new Error(`No manifest glob match for key: ${manifestKey}`);
    const manifestModule = (await manifestLoader()) as Record<string, unknown>;
    const manifest = manifestModule[`${name}Manifest`] as { eventsCatalog: Array<{ name: string }> };
    expect(manifest.eventsCatalog.length).toBe(1);
    expect(manifest.eventsCatalog[0]?.name ?? '').toMatch(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2}$/);
  });
}

test('all 22 generated modules together produce a valid, cycle-free topological load order', () => {
  const nodes: ModuleNode[] = MODULES.map((spec: ModuleSpec) => ({
    name: spec.slug,
    depends: spec.depends ?? [],
    required: spec.tier === 'core' || spec.tier === 'admin',
  }));
  const order = topologicalLoadOrder(nodes);
  expect(order.length).toBe(MODULES.length);
  // every dependency must precede its dependent in the resulting order
  const position = new Map(order.map((n, i) => [n, i]));
  for (const spec of MODULES) {
    for (const dep of spec.depends ?? []) {
      expect((position.get(dep) ?? Infinity) < (position.get(spec.slug) ?? -1)).toBeTruthy();
    }
  }
});

test('module slugs are unique across all 22 generated modules', () => {
  const slugs = MODULES.map((m: ModuleSpec) => m.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
});
