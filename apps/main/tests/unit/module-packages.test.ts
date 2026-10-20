import { test, expect, describe, afterAll, beforeAll } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Container } from '../../src/di/container.js';
import { ModuleLoader } from '../../src/module-system/loader.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import { verifyStagedBuild } from '../../src/module-system/promotion.js';
import {
  loadModulesFromTierVolumes,
  MODULE_VOLUME_NAMES,
  STAGING_VOLUME_NAME,
  TIER_VOLUME_NAMES,
} from '../../src/module-system/swastik-loader.js';
import { validateTierRules } from '../../src/module-system/tier-rules.js';
import type { Logger } from '../../src/logging/logger.js';
import {
  buildModulePackage,
  discoverModulePackages,
  readBuiltModules,
} from '../../scripts/build-modules.js';

const SEEDED_SLUGS = [
  'browse',
  'dashboard',
  'health',
  'hello-world',
  'modules',
  'permit',
  'persona',
  'queue',
] as const;

function fakeLogger(): Logger {
  const noop = (): void => undefined;
  return {
    child: () => fakeLogger(),
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    setLevel: noop,
  } as unknown as Logger;
}

const tempRoots: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

function promotedDir(volume: string, slug: string, version: string): string {
  return join(volume, `${slug}__${version}`);
}

function tierVolumeFor(tier: string): string {
  const volume = (TIER_VOLUME_NAMES as Readonly<Record<string, string>>)[tier];
  if (volume === undefined) throw new Error(`unknown module tier: ${tier}`);
  return volume;
}

function emptyTierVolumes(modulesDir: string): void {
  for (const volumeName of Object.values(TIER_VOLUME_NAMES)) {
    mkdirSync(join(modulesDir, volumeName), { recursive: true });
  }
}

function installArtifact(buildDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  cpSync(join(buildDir, 'manifest.json'), join(targetDir, 'manifest.json'));
  cpSync(join(buildDir, 'index.js'), join(targetDir, 'index.js'));
  // §30 — en-US.json is mandatory; Stage 11 fails without it.
  cpSync(join(buildDir, 'locales'), join(targetDir, 'locales'), { recursive: true });
}

afterAll(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

describe('module packages', () => {
  // The manifest contract (spec/modules/module-anatomy-manifest.md) requires `devId`, `visibility`
  // and `releaseStatus` on every manifest; `buildId` is platform-issued and is NOT a manifest field
  // (UR-20261019-103). The re-seeded stubs used to omit the identity fields, which is exactly what
  // REC-021 flagged as a code-gap.
  test('every removed module is re-seeded as a manifest-valid package', () => {
    const packages = discoverModulePackages();
    expect(packages.map((pkg) => pkg.slug).sort()).toStrictEqual([...SEEDED_SLUGS].sort());
    for (const pkg of packages) {
      expect(pkg.manifest.name).toBe(pkg.slug);
      expect(pkg.manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Object.keys(TIER_VOLUME_NAMES)).toContain(pkg.tier);
      expect(validateTierRules(pkg.manifest)).toStrictEqual([]);
      expect(pkg.manifest.hardcoded).toBe(false);
      expect(pkg.manifest.hardcodeGuildId).toBeUndefined();
      // Required by the contract, so every first-party package must carry them.
      expect(pkg.manifest.devId).toBe('dev_first_party');
      expect('buildId' in pkg.manifest).toBe(false);
      expect(['public', 'unlisted', 'private']).toContain(pkg.manifest.visibility);
      expect(['private', 'public']).toContain(pkg.manifest.releaseStatus);
    }
  });

  test('each package is authored for the tier volume it is promoted into', () => {
    const packages = discoverModulePackages();
    const volumeFor = new Map(packages.map((pkg) => [pkg.slug, tierVolumeFor(pkg.tier)]));
    expect(volumeFor.get('health')).toBe('modules-core');
    expect(volumeFor.get('permit')).toBe('modules-core');
    expect(volumeFor.get('hello-world')).toBe('modules-standard');
    expect(packages.filter((pkg) => pkg.tier === 'standard').map((pkg) => pkg.slug)).toStrictEqual([
      'hello-world',
    ]);
  });
});

describe('promotion path', () => {
  let builtRoot = '';
  let healthBuildDir = '';
  let helloBuildDir = '';

  beforeAll(async () => {
    builtRoot = tempDir('dumby-first-party-build-');
    const packages = discoverModulePackages();
    for (const slug of ['health', 'hello-world']) {
      const pkg = packages.find((candidate) => candidate.slug === slug);
      if (pkg === undefined) throw new Error(`missing first-party package: ${slug}`);
      const built = await buildModulePackage(pkg, builtRoot);
      if (slug === 'health') healthBuildDir = built.buildDir;
      else helloBuildDir = built.buildDir;
    }
  });

  test('build artifacts are exactly what the promotion path verifies', () => {
    const built = readBuiltModules(builtRoot);
    expect(built.map((pkg) => pkg.slug).sort()).toStrictEqual(['health', 'hello-world']);
    for (const pkg of built) {
      expect(pkg.indexBytes).toBeGreaterThan(0);
      const stagingRoot = tempDir('dumby-first-party-staging-');
      installArtifact(pkg.buildDir, promotedDir(stagingRoot, pkg.slug, pkg.version));
      const verification = verifyStagedBuild({
        stagingVolume: stagingRoot,
        moduleSlug: pkg.slug,
        version: pkg.version,
      });
      expect(verification.ok).toBe(true);
      expect(verification.manifest?.tier).toBe(pkg.tier);
    }
  });

  test('a promoted module loads and runs its lifecycle from its tier volume', async () => {
    const modulesDir = tempDir('dumby-first-party-modules-');
    emptyTierVolumes(modulesDir);
    const target = promotedDir(join(modulesDir, 'modules-core'), 'health', '1.0.0');
    installArtifact(healthBuildDir, target);

    const registry = new ModuleRegistry();
    const result = await loadModulesFromTierVolumes({ modulesDir, registry, logger: fakeLogger() });
    expect(result.failed).toStrictEqual([]);
    expect(result.loaded).toStrictEqual(['health']);

    const loader = new ModuleLoader(registry, new Container(), fakeLogger());
    loader.validateAll();
    const report = await loader.loadAll();
    expect(report.fatal).toStrictEqual([]);
    expect((await loader.readyAll(report.order)).failed).toStrictEqual([]);

    const promoted = (await import(pathToFileURL(join(target, 'index.js')).href)) as {
      MODULE_SLUG: string;
      loadCount: () => number;
      currentState: () => string;
    };
    expect(promoted.MODULE_SLUG).toBe('health');
    expect(promoted.loadCount()).toBe(1);
    expect(promoted.currentState()).toBe('ready');

    await loader.unloadAll(report.order);
    expect(promoted.currentState()).toBe('loading');
  });

  test('a promoted build that is still staged is loaded exactly once', async () => {
    const modulesDir = tempDir('dumby-first-party-staged-copy-');
    emptyTierVolumes(modulesDir);
    installArtifact(
      healthBuildDir,
      promotedDir(join(modulesDir, 'modules-core'), 'health', '1.0.0'),
    );
    installArtifact(
      healthBuildDir,
      promotedDir(join(modulesDir, 'swastik-staging'), 'health', '1.0.0'),
    );

    const registry = new ModuleRegistry();
    const result = await loadModulesFromTierVolumes({ modulesDir, registry, logger: fakeLogger() });
    expect(result.failed).toStrictEqual([]);
    expect(result.loaded).toStrictEqual(['health']);
    expect(registry.count()).toBe(1);
    expect(MODULE_VOLUME_NAMES).not.toContain(STAGING_VOLUME_NAME as never);
  });

  test('tier-at-rest holds in both directions', async () => {
    const coreInStandard = tempDir('dumby-first-party-mismatch-');
    emptyTierVolumes(coreInStandard);
    installArtifact(
      healthBuildDir,
      promotedDir(join(coreInStandard, 'modules-standard'), 'health', '1.0.0'),
    );
    await expect(
      loadModulesFromTierVolumes({
        modulesDir: coreInStandard,
        registry: new ModuleRegistry(),
        logger: fakeLogger(),
      }),
    ).rejects.toThrow(/modules-standard\/health__1\.0\.0/);

    const standardInCore = tempDir('dumby-first-party-mismatch-');
    emptyTierVolumes(standardInCore);
    installArtifact(
      helloBuildDir,
      promotedDir(join(standardInCore, 'modules-core'), 'hello-world', '1.0.0'),
    );
    await expect(
      loadModulesFromTierVolumes({
        modulesDir: standardInCore,
        registry: new ModuleRegistry(),
        logger: fakeLogger(),
      }),
    ).rejects.toThrow(/modules-core\/hello-world__1\.0\.0/);
  });
});
