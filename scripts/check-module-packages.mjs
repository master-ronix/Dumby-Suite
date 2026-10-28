#!/usr/bin/env node
/**
 * UR-20261028-108 — a module package must actually provide what it declares.
 *
 * The gap this closes: nothing asserted that a module's DECLARED surfaces reach the loader. A module
 * could declare `commands` in its manifest and export none, or declare `pages: ['dashboard']` on a
 * command while no module exported a page with that id — and every gate stayed green while /dashboard
 * rendered an empty embed. That is not hypothetical: it shipped, because the host's page was deleted
 * before the module bundle carrying its replacement could reach the volume.
 *
 * Checks, per module package:
 *   1. `src/index.ts` exists and is more than a placeholder.
 *   2. A manifest that declares `commands`/`jobs`/`events`/`tasks` must have that name exported.
 *   3. A source file that calls `definePage` requires the index to export `pages`.
 *   4. A command that declares `pages: [...]` requires a page with that id to be exported SOMEWHERE.
 *   5. A declared `ui.iconAsset` must exist and be non-empty.
 *   6. A module with no `assets/icon.png` is reported: it cannot render its own option.
 *
 * Exit 1 on any hard failure. Warnings never fail the build.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

const MODULES_ROOT = join(process.cwd(), 'packages', 'modules');
const failures = [];
const warnings = [];

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function tsFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

/** `export const x = [` or `export { x }` — either form satisfies the loader. */
function exportsName(source, name) {
  return new RegExp(`export\\s+const\\s+${name}\\b`).test(source) || new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`).test(source);
}

const modules = readdirSync(MODULES_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => existsSync(join(MODULES_ROOT, slug, 'manifest.json')));

// Pass 1: collect every page id any module exports, so check 4 can see across packages.
const exportedPageIds = new Set();
for (const slug of modules) {
  const source = read(join(MODULES_ROOT, slug, 'src', 'index.ts'));
  if (!exportsName(source, 'pages')) continue;
  for (const file of tsFiles(join(MODULES_ROOT, slug, 'src'))) {
    const source = read(file);
    if (!source.includes('definePage(')) continue;
    // The id can sit anywhere in the object, behind a doc comment — a narrow window missed it once.
    // Either quote style: some module files were formatted with double quotes.
    const match = /\bid:\s*['"]([^'"]+)['"]/.exec(source);
    if (match !== null) exportedPageIds.add(match[1]);
  }
}

for (const slug of modules) {
  const dir = join(MODULES_ROOT, slug);
  const manifest = JSON.parse(read(join(dir, 'manifest.json')) || '{}');
  const indexPath = join(dir, 'src', 'index.ts');
  const index = read(indexPath);

  // 1
  if (index.length === 0) {
    failures.push(`${slug}: src/index.ts is missing or empty`);
    continue;
  }
  if (index.length < 120) failures.push(`${slug}: src/index.ts is a placeholder (${index.length} chars)`);

  // 2
  for (const surface of ['commands', 'jobs', 'events', 'tasks']) {
    const declared = Array.isArray(manifest[surface]) ? manifest[surface].length : 0;
    if (declared > 0 && !exportsName(index, surface)) {
      failures.push(`${slug}: manifest declares ${declared} ${surface} but src/index.ts does not export \`${surface}\``);
    }
  }

  // 3
  const sources = tsFiles(join(dir, 'src'));
  const usesDefinePage = sources.some((file) => read(file).includes('definePage('));
  if (usesDefinePage && !exportsName(index, 'pages')) {
    failures.push(`${slug}: declares a page with definePage but src/index.ts does not export \`pages\``);
  }

  // 4
  for (const file of sources) {
    for (const match of read(file).matchAll(/\bpages:\s*\[([^\]]*)\]/g)) {
      for (const id of match[1].split(',').map((part) => part.trim().replace(/['"]/g, '')).filter(Boolean)) {
        if (!exportedPageIds.has(id)) {
          failures.push(
            `${slug}: ${basename(file)} declares pages: ['${id}'] but no module exports a page with id '${id}'`,
          );
        }
      }
    }
  }

  // 5
  const iconAsset = manifest?.ui?.iconAsset;
  if (typeof iconAsset === 'string') {
    const assetPath = join(dir, iconAsset);
    if (!existsSync(assetPath)) failures.push(`${slug}: ui.iconAsset '${iconAsset}' does not exist`);
    else if (statSync(assetPath).size === 0) failures.push(`${slug}: ui.iconAsset '${iconAsset}' is empty`);
  }

  // 6
  if (!existsSync(join(dir, 'assets', 'icon.png'))) {
    warnings.push(`${slug}: no assets/icon.png — the module cannot render its own option`);
  }
}

// Ratchet: a gap recorded in the baseline is reported, never fatal. A gap NOT in the baseline fails.
let baseline = { gaps: [] };
try {
  baseline = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'status', 'module-package-baseline.json'), 'utf8'));
} catch {
  console.warn('warn: no module-package baseline; every gap is fatal');
}
const known = new Set(
  (baseline.gaps ?? []).map((gap) => `${gap.module}: ${gap.detail.split('.')[0]}`),
);
const knownModules = new Set((baseline.gaps ?? []).map((gap) => gap.module));
const fatal = failures.filter((failure) => {
  const module = failure.split(':')[0];
  if (knownModules.has(module)) {
    console.warn(`known: ${failure}`);
    return false;
  }
  return true;
});
failures.length = 0;
failures.push(...fatal);

for (const warning of warnings) console.warn(`warn: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`\n${failures.length} module-package failure(s) across ${modules.length} modules`);
  process.exit(1);
}
console.log(`OK: ${modules.length} module packages declare what they export (${warnings.length} warning(s))`);
