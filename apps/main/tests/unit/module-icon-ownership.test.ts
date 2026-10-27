import { describe, test, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../spec-utils.js';

/**
 * OI-11 — a module's artwork belongs to the module.
 *
 * The residual register carried "framework icon assets live in the CORE module, including first-party
 * module logos" as open. Re-reading the tree, the bulk of it has been fixed: the framework's bundled
 * icon set is now framework UI and metric artwork only, and each module declares `ui.icon` plus
 * `ui.iconAsset` pointing at its OWN `assets/icon.png`.
 *
 * This test locks that in, so it cannot regress: the core icon set may not name a module's logo, and a
 * module that ships artwork must declare it. `dashboard` is the one documented exception — its logo is
 * the framework's Home icon, which lives in the core set by design; it is carried as its own residual
 * rather than silently tolerated here.
 */
const MODULES_DIR = join(repoRoot, 'packages', 'modules');
const EXCEPTIONS = new Set(['dashboard']);

interface ManifestUi {
  icon?: string;
  iconAsset?: string;
}

function modules(): { slug: string; ui: ManifestUi; hasArtwork: boolean }[] {
  return readdirSync(MODULES_DIR)
    .filter((entry) => existsSync(join(MODULES_DIR, entry, 'manifest.json')))
    .map((slug) => {
      const manifest = JSON.parse(
        readFileSync(join(MODULES_DIR, slug, 'manifest.json'), 'utf8'),
      ) as { ui?: ManifestUi };
      return {
        slug,
        ui: manifest.ui ?? {},
        hasArtwork: existsSync(join(MODULES_DIR, slug, 'assets', 'icon.png')),
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** The emoji names the framework uploads from its own assets. */
function coreIconNames(): string[] {
  const source = readFileSync(
    join(repoRoot, 'apps/main/src/rendering/module-emoji-upload.ts'),
    'utf8',
  );
  const block = /const ICON_ASSETS[^=]*=\s*\[([\s\S]*?)\n\];/.exec(source);
  expect(block).not.toBeNull();
  const names: string[] = [];
  for (const line of (block?.[1] ?? '').split('\n')) {
    const literal = /^\s*\[\s*'([^']+)'\s*,/.exec(line);
    if (literal?.[1] !== undefined) names.push(literal[1]);
    const constant = /^\s*\[\s*([A-Z][A-Z0-9_]*)\s*,/.exec(line);
    if (constant?.[1] !== undefined) names.push(constant[1]);
  }
  return names;
}

describe('OI-11 — module artwork is owned by the module', () => {
  test('the framework icon set names no module logo', () => {
    const names = coreIconNames();
    expect(names.length).toBeGreaterThan(10);
    const slugs = modules().map((module) => module.slug);
    // A core-set entry named after a module slug would be that module's logo living in the core base.
    const perModule = slugs
      .filter((slug) => !EXCEPTIONS.has(slug))
      .filter((slug) => names.some((name) => name === `dumby_${slug}` || name === `dumby-${slug}`));
    expect(perModule).toEqual([]);
  });

  test('every module that ships artwork declares it', () => {
    const undeclared = modules()
      .filter((module) => module.hasArtwork && !EXCEPTIONS.has(module.slug))
      .filter((module) => module.ui.iconAsset === undefined)
      .map((module) => module.slug);
    expect(undeclared).toEqual([]);
  });

  test('a declared asset is the module’s own file, not a path into the core base', () => {
    const external = modules()
      .filter((module) => module.ui.iconAsset !== undefined)
      .filter((module) => {
        const asset = module.ui.iconAsset ?? '';
        return asset.startsWith('/') || asset.includes('..') || !asset.startsWith('assets/');
      })
      .map((module) => `${module.slug}: ${String(module.ui.iconAsset)}`);
    expect(external).toEqual([]);
  });

  test('the one documented exception is exactly one module', () => {
    // If a second module starts borrowing a core icon, this fails and the exception is re-examined.
    const borrowing = modules()
      .filter((module) => module.ui.iconAsset === undefined)
      .map((module) => module.slug);
    expect(borrowing).toEqual([...EXCEPTIONS].filter((slug) => borrowing.includes(slug)));
  });
});
