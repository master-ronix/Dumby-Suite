import { test, expect, describe, afterAll, beforeAll } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Container } from '../../src/di/container.js';
import { parseManifest } from '../../src/module-system/manifest.schema.js';
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
import type { BuiltFirstPartyModule } from '../../scripts/build-first-party-modules.js';
import {
  buildFirstPartyModulePackage,
  discoverFirstPartyModulePackages,
  readBuiltFirstPartyModules,
} from '../../scripts/build-first-party-modules.js';
import {
  resolveOptions,
  selectPackages,
  SeedRefusedError,
} from '../../scripts/seed-first-party-modules.js';

const APP_ROOT = resolve(import.meta.dirname, '..', '..');
const SCRIPTS_DIR = join(APP_ROOT, 'scripts');

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
}

afterAll(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

describe('first-party module packages', () => {
  test('every removed first-party module is re-seeded as a manifest-valid package', () => {
    const packages = discoverFirstPartyModulePackages();
    expect(packages.map((pkg) => pkg.slug).sort()).toStrictEqual([...SEEDED_SLUGS].sort());
    for (const pkg of packages) {
      expect(pkg.manifest.name).toBe(pkg.slug);
      expect(pkg.manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(Object.keys(TIER_VOLUME_NAMES)).toContain(pkg.tier);
      expect(validateTierRules(pkg.manifest)).toStrictEqual([]);
      expect(pkg.manifest.hardcoded).toBe(false);
      expect(pkg.manifest.hardcodeGuildId).toBeUndefined();
      expect(pkg.manifest.devId).toBeUndefined();
      expect(pkg.manifest.buildId).toBeUndefined();
    }
  });

  test('each package is authored for the tier volume it is promoted into', () => {
    const packages = discoverFirstPartyModulePackages();
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
    const packages = discoverFirstPartyModulePackages();
    for (const slug of ['health', 'hello-world']) {
      const pkg = packages.find((candidate) => candidate.slug === slug);
      if (pkg === undefined) throw new Error(`missing first-party package: ${slug}`);
      const built = await buildFirstPartyModulePackage(pkg, builtRoot);
      if (slug === 'health') healthBuildDir = built.buildDir;
      else helloBuildDir = built.buildDir;
    }
  });

  test('build artifacts are exactly what the promotion path verifies', () => {
    const built = readBuiltFirstPartyModules(builtRoot);
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

describe('seed tooling cannot bypass the promotion path', () => {
  const seedSource = readFileSync(join(SCRIPTS_DIR, 'seed-first-party-modules.ts'), 'utf8');
  const buildSource = readFileSync(join(SCRIPTS_DIR, 'build-first-party-modules.ts'), 'utf8');
  const swastikSource = readFileSync(join(APP_ROOT, 'src', 'entry', 'swastik.ts'), 'utf8');
  const seedCode = seedSource.replace(/\/\*[\s\S]*?\*\//g, '');
  const buildCode = buildSource.replace(/\/\*[\s\S]*?\*\//g, '');

  test('the seed script promotes over HTTP and never writes to a volume', () => {
    expect(seedCode).toContain('${swastikUrl}/internal/deploy');
    for (const writeApi of [
      'writeFileSync',
      'mkdirSync',
      'cpSync',
      'copyFileSync',
      'renameSync',
      'rmSync',
      'symlinkSync',
      'appendFileSync',
    ]) {
      expect(seedCode).not.toContain(writeApi);
    }
    for (const volumeVar of [
      'MODULES_DIR',
      'SWASTIK_LIVE_VOLUME_PATH',
      'SWASTIK_STAGING_VOLUME_PATH',
    ]) {
      expect(seedCode).not.toContain(volumeVar);
    }
    for (const tierVolume of Object.values(TIER_VOLUME_NAMES)) {
      expect(seedCode).not.toContain(tierVolume);
    }
  });

  test('the seed script fails closed without explicit human approval', () => {
    expect(seedCode).toContain("humanApproved: flags.get('--human-approved') === true");
    expect(seedCode).toContain('humanApproved,');
  });

  test('the build script only emits build artifacts, never a tier volume', () => {
    expect(buildCode).toContain('FIRST_PARTY_BUILD_ROOT');
    for (const tierVolume of Object.values(TIER_VOLUME_NAMES)) {
      expect(buildCode).not.toContain(tierVolume);
    }
    expect(buildCode).not.toContain('SWASTIK_LIVE_VOLUME_PATH');
  });

  test('swastik promotes each build into the tier volume its manifest declares', () => {
    expect(swastikSource).toContain('function liveVolumeForTier(tier: ModuleTier): string');
    expect(swastikSource).toContain('liveVolume: liveVolumeForTier(manifest.tier)');
    expect(swastikSource).toContain('liveVolume: liveVolumeForTier(stagedManifest.tier)');
    expect(swastikSource).not.toMatch(/promoteUnderLock\(\{[^}]*?\bliveVolume,\n/s);
  });
});

describe('seed options', () => {
  const requiredEnv = {
    DATABASE_URL: 'postgres://localhost/dumby_test',
    REDIS_URL: 'redis://localhost:6379/0',
    QUEUE_REDIS_URL: 'redis://localhost:6379/1',
    INTERNAL_API_KEY: 'supersecretkey_supersecretkey_32',
    ENCRYPTION_ROOT_KEY: 'JF8PejG/00/nD5iuxpUtzGqh5MWW3yL1Oj6EcWYPgzM=',
    DEV_GUILD_ID: '900000000000000001',
  };
  const saved = new Map<string, string | undefined>();

  beforeAll(() => {
    for (const [key, value] of Object.entries(requiredEnv)) {
      saved.set(key, process.env[key]);
      process.env[key] = value;
    }
  });

  afterAll(() => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test('human approval is opt-in', () => {
    expect(resolveOptions([]).humanApproved).toBe(false);
    expect(resolveOptions(['--human-approved']).humanApproved).toBe(true);
    expect(resolveOptions(['--no-build']).build).toBe(false);
  });

  test('the internal key is mandatory', () => {
    const key = process.env['INTERNAL_API_KEY'];
    delete process.env['INTERNAL_API_KEY'];
    try {
      expect(() => resolveOptions([])).toThrow(SeedRefusedError);
    } finally {
      if (key !== undefined) process.env['INTERNAL_API_KEY'] = key;
    }
  });

  test('module selection is explicit and rejects unknown slugs', () => {
    const built = [
      { slug: 'health', version: '1.0.0', tier: 'core' },
      { slug: 'hello-world', version: '1.0.0', tier: 'standard' },
    ] as unknown as BuiltFirstPartyModule[];
    expect(selectPackages(built, null).map((pkg) => pkg.slug)).toStrictEqual([
      'health',
      'hello-world',
    ]);
    expect(selectPackages(built, ['hello-world']).map((pkg) => pkg.slug)).toStrictEqual([
      'hello-world',
    ]);
    expect(() => selectPackages(built, ['permit-typo'])).toThrow(SeedRefusedError);
  });
});

describe('seeded manifest payload', () => {
  test('re-validates once the deploying devId is injected', () => {
    const pkg = discoverFirstPartyModulePackages().find((p) => p.slug === 'health');
    if (pkg === undefined) throw new Error('health package missing');
    expect(parseManifest({ ...pkg.manifest, devId: 'dev_first_party' }).devId).toBe(
      'dev_first_party',
    );
  });

  test('authored manifests contain no keys the schema does not declare', () => {
    for (const pkg of discoverFirstPartyModulePackages()) {
      const raw = JSON.parse(readFileSync(pkg.manifestPath, 'utf8')) as Record<string, unknown>;
      expect(Object.keys(raw).sort()).toStrictEqual(Object.keys(pkg.manifest).sort());
    }
  });

  test('module build output is gitignored', () => {
    expect(readFileSync(join(APP_ROOT, '.gitignore'), 'utf8')).toContain('dist-modules/');
  });
});
