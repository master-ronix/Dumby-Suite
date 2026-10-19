import { test, expect } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import { loadModulesFromTierVolumes } from '../../src/module-system/swastik-loader.js';
import { InMemoryBuildStore } from '../../src/db/repositories/build.repository.js';
import { hashFile, writeBuildProvenanceSidecar } from '../../src/module-system/build-signing.js';
import type { Logger } from '../../src/logging/logger.js';
import type { ModuleManifest } from '../../src/module-system/manifest.schema.js';

/**
 * UR-20261018-093 / UR-20261019-100 — baked-module provenance. A module packed into the image has no
 * `builds` row; the loader verifies it against the image build manifest (`<volume>/<slug>` -> hash).
 * These cases guard the baked path and the Docker COPY relocation (relative keys, content-only hashes).
 */

function fakeLogger(): Logger {
  const noop = (): void => undefined;
  const l = { child: () => l, trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop, setLevel: noop };
  return l as unknown as Logger;
}

function manifest(name: string, tier: string): ModuleManifest {
  return {
    name, version: '1.0.0', description: 'd', tier, hardcoded: false, devId: 'dev_first_party',
    buildId: `build_${name}_1_0_0`, visibility: 'public', releaseStatus: 'public', required: false,
    depends: [], provides: [], intents: [], partials: [], commands: [], events: [], services: [],
    repositories: [], jobs: [], tasks: [], routes: [], middleware: [], migrations: [], locales: ['en-US'],
    config: {}, eventsCatalog: [], crossModuleReads: [],
  } as unknown as ModuleManifest;
}

/** Writes a baked module (manifest + index.js + locales + baked sidecar); returns its artifact hash. */
function writeBakedModule(root: string, volume: string, slug: string, tier: string): string {
  const dir = join(root, volume, slug);
  mkdirSync(join(dir, 'locales'), { recursive: true });
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest(slug, tier)));
  writeFileSync(join(dir, 'index.js'), 'export const onLoad = () => undefined;\n');
  writeFileSync(join(dir, 'locales', 'en-US.json'), '{}');
  const artifactHash = hashFile(join(dir, 'index.js'));
  writeBuildProvenanceSidecar(dir, {
    buildId: `baked_${slug}_1.0.0`, moduleSlug: slug, version: '1.0.0', devId: 'dev_first_party',
    sourceArchiveHash: '', artifactHash, lockfileHash: '', gateResultsHash: '',
    signature: '', signatureKeyId: '', signedDescriptor: '', baked: true,
  });
  return artifactHash;
}

test('UR-100: a baked module loads against the image manifest with no builds row', async () => {
  const root = mkdtempSync(join(tmpdir(), 'baked-'));
  mkdirSync(join(root, 'modules-core'), { recursive: true });
  const hash = writeBakedModule(root, 'modules-core', 'hello-world', 'core');
  const result = await loadModulesFromTierVolumes({
    modulesDir: root, registry: new ModuleRegistry(), logger: fakeLogger(),
    buildStore: new InMemoryBuildStore(),
    bakedManifest: { 'modules-core/hello-world': hash },
  });
  expect(result.loaded).toStrictEqual(['hello-world']);
  expect(result.refused).toStrictEqual([]);
});

test('UR-100: a forged baked sidecar with no manifest entry is refused', async () => {
  const root = mkdtempSync(join(tmpdir(), 'baked-'));
  mkdirSync(join(root, 'modules-core'), { recursive: true });
  writeBakedModule(root, 'modules-core', 'sneaky', 'core');
  const result = await loadModulesFromTierVolumes({
    modulesDir: root, registry: new ModuleRegistry(), logger: fakeLogger(),
    buildStore: new InMemoryBuildStore(), bakedManifest: {},
  });
  expect(result.loaded).toStrictEqual([]);
  expect(result.refused).toStrictEqual(['modules-core/sneaky']);
});

test('UR-100: an image-update mismatch (manifest hash differs) is refused', async () => {
  const root = mkdtempSync(join(tmpdir(), 'baked-'));
  mkdirSync(join(root, 'modules-core'), { recursive: true });
  writeBakedModule(root, 'modules-core', 'hello-world', 'core');
  const result = await loadModulesFromTierVolumes({
    modulesDir: root, registry: new ModuleRegistry(), logger: fakeLogger(),
    buildStore: new InMemoryBuildStore(),
    bakedManifest: { 'modules-core/hello-world': 'sha256:staleimage' },
  });
  expect(result.refused).toStrictEqual(['modules-core/hello-world']);
});

test('UR-100: a baked module loads from a RELOCATED tree (guards the Docker COPY)', async () => {
  const a = mkdtempSync(join(tmpdir(), 'bakedA-'));
  const b = mkdtempSync(join(tmpdir(), 'bakedB-'));
  mkdirSync(join(a, 'modules-core'), { recursive: true });
  const hash = writeBakedModule(a, 'modules-core', 'hello-world', 'core');
  writeFileSync(join(a, 'baked-manifest.json'), JSON.stringify({ 'modules-core/hello-world': hash }));
  cpSync(a, b, { recursive: true }); // mirror COPY /mnt/modules -> /app/baked-modules
  const manifest = JSON.parse(readFileSync(join(b, 'baked-manifest.json'), 'utf8')) as Record<string, string>;
  expect(Object.keys(manifest).some((k) => k.startsWith('/'))).toBe(false);
  const result = await loadModulesFromTierVolumes({
    modulesDir: b, registry: new ModuleRegistry(), logger: fakeLogger(),
    buildStore: new InMemoryBuildStore(), bakedManifest: manifest,
  });
  expect(result.loaded).toStrictEqual(['hello-world']);
  expect(result.refused).toStrictEqual([]);
});
