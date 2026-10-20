import { build } from 'esbuild';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseManifest, type ModuleManifest } from '../src/module-system/manifest.schema.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = resolve(scriptDir, '..');
export const MODULES_SOURCE_ROOT = resolve(APP_ROOT, '..', '..', 'packages', 'modules');
export const MODULES_BUILD_ROOT = join(APP_ROOT, 'dist-modules');

const ENTRY_RELATIVE_PATH = join('src', 'index.ts');
const MANIFEST_FILE = 'manifest.json';
const BUNDLE_FILE = 'index.js';

export interface ModulePackage {
  readonly slug: string;
  readonly version: string;
  readonly tier: string;
  readonly manifest: ModuleManifest;
  readonly packageDir: string;
  readonly manifestPath: string;
  readonly entryPath: string;
}

export interface BuiltModule extends ModulePackage {
  readonly buildDir: string;
  readonly builtManifestPath: string;
  readonly builtIndexPath: string;
  readonly indexBytes: number;
}

export class ModulePackageError extends Error {
  constructor(slug: string, reason: string) {
    super(`First-party module package "${slug}" is invalid: ${reason}`);
    this.name = 'ModulePackageError';
  }
}

export function discoverModulePackages(
  packagesRoot: string = MODULES_SOURCE_ROOT,
): ModulePackage[] {
  if (!existsSync(packagesRoot)) {
    throw new Error(`module packages root not found: ${packagesRoot}`);
  }
  const packages: ModulePackage[] = [];
  for (const slug of readdirSync(packagesRoot).sort()) {
    const packageDir = join(packagesRoot, slug);
    const manifestPath = join(packageDir, MANIFEST_FILE);
    const entryPath = join(packageDir, ENTRY_RELATIVE_PATH);
    if (!existsSync(manifestPath) || !existsSync(entryPath)) continue;
    let manifest: ModuleManifest;
    try {
      manifest = parseManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
    } catch (err) {
      throw new ModulePackageError(slug, (err as Error).message);
    }
    if (manifest.name !== slug) {
      throw new ModulePackageError(
        slug,
        `manifest name "${manifest.name}" does not match the package directory`,
      );
    }
    packages.push({
      slug,
      version: manifest.version,
      tier: manifest.tier,
      manifest,
      packageDir,
      manifestPath,
      entryPath,
    });
  }
  return packages;
}

export async function buildModulePackage(
  pkg: ModulePackage,
  outRoot: string = MODULES_BUILD_ROOT,
): Promise<BuiltModule> {
  const buildDir = join(outRoot, pkg.slug);
  rmSync(buildDir, { recursive: true, force: true });
  mkdirSync(buildDir, { recursive: true });

  await build({
    entryPoints: [pkg.entryPath],
    outfile: join(buildDir, BUNDLE_FILE),
    bundle: true,
    format: 'esm',
    platform: 'node',
    conditions: ['workspace'],
    target: 'node22',
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'silent',
  });

  const builtManifestPath = join(buildDir, MANIFEST_FILE);
  const builtIndexPath = join(buildDir, BUNDLE_FILE);
  writeFileSync(builtManifestPath, readFileSync(pkg.manifestPath), 'utf8');
  // §30 — ship the module's locales so the promoted module satisfies the mandatory en-US.json.
  const localesSrc = join(pkg.packageDir, 'locales');
  if (existsSync(localesSrc)) {
    cpSync(localesSrc, join(buildDir, 'locales'), { recursive: true });
  }
  // UR-20261012-066 — ship the module's OWN assets. `assets/` is documented as "static assets your
  // module serves" and the module declares its logo there; without this the tree stops at the bundle
  // and the core has nothing to register. Mirrors the locales copy above deliberately: the built
  // directory is the built module artifact, so anything not copied here never reaches the runtime.
  const assetsSrc = join(pkg.packageDir, 'assets');
  if (existsSync(assetsSrc)) {
    cpSync(assetsSrc, join(buildDir, 'assets'), { recursive: true });
  }
  const indexBytes = readFileSync(builtIndexPath).byteLength;
  if (indexBytes === 0) {
    throw new ModulePackageError(pkg.slug, 'the bundled index.js is empty');
  }
  return { ...pkg, buildDir, builtManifestPath, builtIndexPath, indexBytes };
}

export async function buildAllModulePackages(
  packagesRoot: string = MODULES_SOURCE_ROOT,
  outRoot: string = MODULES_BUILD_ROOT,
): Promise<BuiltModule[]> {
  rmSync(outRoot, { recursive: true, force: true });
  const built: BuiltModule[] = [];
  for (const pkg of discoverModulePackages(packagesRoot)) {
    built.push(await buildModulePackage(pkg, outRoot));
  }
  if (built.length === 0) {
    throw new Error(`no module packages found under ${packagesRoot}`);
  }
  return built;
}

export function readBuiltModules(outRoot: string = MODULES_BUILD_ROOT): BuiltModule[] {
  if (!existsSync(outRoot)) {
    throw new Error(`no module build artifacts found at ${outRoot}; run \`pnpm build:modules\``);
  }
  const built: BuiltModule[] = [];
  for (const slug of readdirSync(outRoot).sort()) {
    const buildDir = join(outRoot, slug);
    const builtManifestPath = join(buildDir, MANIFEST_FILE);
    const builtIndexPath = join(buildDir, BUNDLE_FILE);
    if (!existsSync(builtManifestPath) || !existsSync(builtIndexPath)) continue;
    const manifest = parseManifest(JSON.parse(readFileSync(builtManifestPath, 'utf8')));
    if (manifest.name !== slug) {
      throw new ModulePackageError(
        slug,
        `built manifest name "${manifest.name}" does not match its artifact directory`,
      );
    }
    built.push({
      slug,
      version: manifest.version,
      tier: manifest.tier,
      manifest,
      packageDir: join(MODULES_SOURCE_ROOT, slug),
      manifestPath: join(MODULES_SOURCE_ROOT, slug, MANIFEST_FILE),
      entryPath: join(MODULES_SOURCE_ROOT, slug, ENTRY_RELATIVE_PATH),
      buildDir,
      builtManifestPath,
      builtIndexPath,
      indexBytes: readFileSync(builtIndexPath).byteLength,
    });
  }
  if (built.length === 0) {
    throw new Error(`no module build artifacts found at ${outRoot}; run \`pnpm build:modules\``);
  }
  return built;
}

async function main(): Promise<void> {
  const built = await buildAllModulePackages();
  process.stdout.write('module build artifacts:\n');
  for (const pkg of built) {
    process.stdout.write(
      `  ${pkg.slug}@${pkg.version} tier=${pkg.tier} -> ${pkg.builtIndexPath} (${pkg.indexBytes} bytes)\n`,
    );
  }
  process.stdout.write(
    'artifacts are NOT live: promote them with `pnpm seed:modules --human-approved`\n',
  );
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err: unknown) => {
    process.stderr.write(`module build failed: ${String(err)}\n`);
    process.exit(1);
  });
}
