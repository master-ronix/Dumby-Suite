import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseManifest, type ModuleManifest } from '../src/module-system/manifest.schema.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = resolve(scriptDir, '..');
export const FIRST_PARTY_MODULES_ROOT = resolve(APP_ROOT, '..', '..', 'packages', 'modules');
export const FIRST_PARTY_BUILD_ROOT = join(APP_ROOT, 'dist-modules');

const ENTRY_RELATIVE_PATH = join('src', 'index.ts');
const MANIFEST_FILE = 'manifest.json';
const BUNDLE_FILE = 'index.js';

export interface FirstPartyModulePackage {
  readonly slug: string;
  readonly version: string;
  readonly tier: string;
  readonly manifest: ModuleManifest;
  readonly packageDir: string;
  readonly manifestPath: string;
  readonly entryPath: string;
}

export interface BuiltFirstPartyModule extends FirstPartyModulePackage {
  readonly buildDir: string;
  readonly builtManifestPath: string;
  readonly builtIndexPath: string;
  readonly indexBytes: number;
}

export class FirstPartyModulePackageError extends Error {
  constructor(slug: string, reason: string) {
    super(`First-party module package "${slug}" is invalid: ${reason}`);
    this.name = 'FirstPartyModulePackageError';
  }
}

export function discoverFirstPartyModulePackages(
  packagesRoot: string = FIRST_PARTY_MODULES_ROOT,
): FirstPartyModulePackage[] {
  if (!existsSync(packagesRoot)) {
    throw new Error(`first-party module packages root not found: ${packagesRoot}`);
  }
  const packages: FirstPartyModulePackage[] = [];
  for (const slug of readdirSync(packagesRoot).sort()) {
    const packageDir = join(packagesRoot, slug);
    const manifestPath = join(packageDir, MANIFEST_FILE);
    const entryPath = join(packageDir, ENTRY_RELATIVE_PATH);
    if (!existsSync(manifestPath) || !existsSync(entryPath)) continue;
    let manifest: ModuleManifest;
    try {
      manifest = parseManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
    } catch (err) {
      throw new FirstPartyModulePackageError(slug, (err as Error).message);
    }
    if (manifest.name !== slug) {
      throw new FirstPartyModulePackageError(
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

export async function buildFirstPartyModulePackage(
  pkg: FirstPartyModulePackage,
  outRoot: string = FIRST_PARTY_BUILD_ROOT,
): Promise<BuiltFirstPartyModule> {
  const buildDir = join(outRoot, pkg.slug);
  rmSync(buildDir, { recursive: true, force: true });
  mkdirSync(buildDir, { recursive: true });

  await build({
    entryPoints: [pkg.entryPath],
    outfile: join(buildDir, BUNDLE_FILE),
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    sourcemap: false,
    legalComments: 'none',
    logLevel: 'silent',
  });

  const builtManifestPath = join(buildDir, MANIFEST_FILE);
  const builtIndexPath = join(buildDir, BUNDLE_FILE);
  writeFileSync(builtManifestPath, readFileSync(pkg.manifestPath), 'utf8');
  const indexBytes = readFileSync(builtIndexPath).byteLength;
  if (indexBytes === 0) {
    throw new FirstPartyModulePackageError(pkg.slug, 'the bundled index.js is empty');
  }
  return { ...pkg, buildDir, builtManifestPath, builtIndexPath, indexBytes };
}

export async function buildAllFirstPartyModulePackages(
  packagesRoot: string = FIRST_PARTY_MODULES_ROOT,
  outRoot: string = FIRST_PARTY_BUILD_ROOT,
): Promise<BuiltFirstPartyModule[]> {
  rmSync(outRoot, { recursive: true, force: true });
  const built: BuiltFirstPartyModule[] = [];
  for (const pkg of discoverFirstPartyModulePackages(packagesRoot)) {
    built.push(await buildFirstPartyModulePackage(pkg, outRoot));
  }
  if (built.length === 0) {
    throw new Error(`no first-party module packages found under ${packagesRoot}`);
  }
  return built;
}

export function readBuiltFirstPartyModules(
  outRoot: string = FIRST_PARTY_BUILD_ROOT,
): BuiltFirstPartyModule[] {
  if (!existsSync(outRoot)) {
    throw new Error(
      `no first-party build artifacts found at ${outRoot}; run \`pnpm build:modules\``,
    );
  }
  const built: BuiltFirstPartyModule[] = [];
  for (const slug of readdirSync(outRoot).sort()) {
    const buildDir = join(outRoot, slug);
    const builtManifestPath = join(buildDir, MANIFEST_FILE);
    const builtIndexPath = join(buildDir, BUNDLE_FILE);
    if (!existsSync(builtManifestPath) || !existsSync(builtIndexPath)) continue;
    const manifest = parseManifest(JSON.parse(readFileSync(builtManifestPath, 'utf8')));
    if (manifest.name !== slug) {
      throw new FirstPartyModulePackageError(
        slug,
        `built manifest name "${manifest.name}" does not match its artifact directory`,
      );
    }
    built.push({
      slug,
      version: manifest.version,
      tier: manifest.tier,
      manifest,
      packageDir: join(FIRST_PARTY_MODULES_ROOT, slug),
      manifestPath: join(FIRST_PARTY_MODULES_ROOT, slug, MANIFEST_FILE),
      entryPath: join(FIRST_PARTY_MODULES_ROOT, slug, ENTRY_RELATIVE_PATH),
      buildDir,
      builtManifestPath,
      builtIndexPath,
      indexBytes: readFileSync(builtIndexPath).byteLength,
    });
  }
  if (built.length === 0) {
    throw new Error(
      `no first-party build artifacts found at ${outRoot}; run \`pnpm build:modules\``,
    );
  }
  return built;
}

async function main(): Promise<void> {
  const built = await buildAllFirstPartyModulePackages();
  process.stdout.write('first-party module build artifacts:\n');
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
    process.stderr.write(`first-party module build failed: ${String(err)}\n`);
    process.exit(1);
  });
}
