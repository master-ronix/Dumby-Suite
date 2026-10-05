import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * M10 — Terminology & legacy-name sweep. Canonical vocabulary: "DRM" → **Release Manager**,
 * "Twixter" → **Twill** (the owner reversed the earlier Twill → Twixter direction on 2026-10-03),
 * canonical ranks **MODERATOR / ADMINISTRATOR**.
 *
 * The sweep covers the **living set** — code, tests, config, and the repo's own operational docs.
 * The owner widened it on 2026-10-03: the docs are swept too, except the rename's own record
 * (the change-log's mapping statement and this ledger's entries, which must keep the old term).
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');

const LEGACY = /\b(DRM|Twixter)\b/;

/** Reads every .md/.json under the given docs subtrees, joined — archive/** is never included. */
function readCorpus(dirs: readonly string[]): string {
  const parts: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(md|json|ya?ml)$/.test(entry.name)) parts.push(readFileSync(full, 'utf8'));
    }
  };
  for (const d of dirs) walk(resolve(repoRoot, d));
  return parts.join('\n');
}

/** Directories and files that make up the living set. */
const LIVING_ROOTS = ['apps', 'packages', 'tools', 'scripts'];
const LIVING_FILES = ['replit.md', 'AGENTS.md', 'README.md', 'STATUS.md'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const TEXT_EXT = /\.(ts|tsx|js|mjs|cjs|json|md|yml|yaml|sql)$/;

function livingFiles(): string[] {
  const files: string[] = [];
  for (const root of LIVING_ROOTS) {
    const abs = resolve(repoRoot, root);
    if (statSync(abs).isDirectory()) walk(abs, files);
  }
  for (const file of LIVING_FILES) {
    const abs = resolve(repoRoot, file);
    if (statSync(abs).isFile()) files.push(abs);
  }
  return files.filter(
    (file) =>
      TEXT_EXT.test(file) &&
      // A scan for a term necessarily contains the term, so the guard is excluded from its own sweep.
      !file.endsWith('m10-terminology-sweep.test.ts'),
  );
}

describe('M10 — terminology & legacy-name sweep', () => {
  test('no legacy name survives in the living set', () => {
    const offenders = livingFiles()
      .map((file) => ({ file: file.slice(repoRoot.length + 1), body: readFileSync(file, 'utf8') }))
      .filter(({ body }) => LEGACY.test(body))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test('the canonical vocabulary is what the code actually uses', () => {
    const rank = readFileSync(resolve(repoRoot, 'apps/main/src/permissions/rank.ts'), 'utf8');
    expect(rank).toContain("'MODERATOR'");
    expect(rank).toContain("'ADMINISTRATOR'");
    // MOD/ADMIN remain only as declared aliases that normalise to the canonical names.
    expect(rank).toMatch(/ADMIN:\s*'ADMINISTRATOR'/);
    expect(rank).toMatch(/MOD:\s*'MODERATOR'/);
  });

  test('the Release Manager identifiers are canonical in the corpus', () => {
    // The corpus was restructured to v5.0.0 on 2026-10-04 (the flat blueprint.md is gone; the
    // behavioural spec lives under docs/spec/, the wiring under docs/blueprint/). archive/** is the
    // quarantined legacy record and is never read as current.
    const corpus = readCorpus(['docs/spec', 'docs/blueprint', 'docs/documentation', 'docs/contracts']);
    expect(corpus).not.toMatch(/drm_deploy_total|drm:core-release|entry\/drm\.js|service:'drm'/);
    expect(corpus).toContain('release_manager_deploy_total');
  });

  test('the docs are swept too, outside the rename record itself', () => {
    const documentation = readCorpus(['docs/documentation']);
    expect(documentation).not.toMatch(/\bDRM\b/);
    // the mapping statement itself must survive, or the rename loses its record
    const changeLog = readFileSync(resolve(repoRoot, 'docs/upgradation/change-log.md'), 'utf8');
    expect(changeLog).toContain('"DRM" → **Release Manager**');
  });
});
