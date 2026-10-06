import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { repoRoot } from '../spec-utils.js';
/**
 * ACC-MOD-0011-5 — "The three-layer rule (command->service->repository) holds and no cross-module
 * imports/writes exist."
 *
 * Authority: docs/spec/modules/module-anatomy-manifest.md. Dependencies run one way: commands call
 * services; services call repositories; neither reaches around the layer between them. Modules are
 * sealed: a module reaches another only through a declared DI token, never by importing its source.
 */
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const modulesDir = `${repoRoot}packages/modules`;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

function slugs(): string[] {
  return readdirSync(modulesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

describe('ACC-MOD-0011-5 — layering and module isolation', () => {
  it('a command never imports a repository directly', () => {
    const offenders: string[] = [];
    for (const slug of slugs()) {
      for (const file of sourceFiles(join(modulesDir, slug, 'src', 'commands'))) {
        const src = readFileSync(file, 'utf8');
        if (/from\s+['"][^'"]*repositor/i.test(src)) offenders.push(relative(repoRoot, file));
      }
    }
    expect(offenders).toStrictEqual([]);
  });

  it('a repository never imports a command', () => {
    const offenders: string[] = [];
    for (const slug of slugs()) {
      for (const file of sourceFiles(join(modulesDir, slug, 'src', 'repositories'))) {
        const src = readFileSync(file, 'utf8');
        if (/from\s+['"][^'"]*\/commands?\//i.test(src)) offenders.push(relative(repoRoot, file));
      }
    }
    expect(offenders).toStrictEqual([]);
  });

  it('no module imports another module by path', () => {
    const offenders: string[] = [];
    for (const slug of slugs()) {
      for (const file of sourceFiles(join(modulesDir, slug, 'src'))) {
        const src = readFileSync(file, 'utf8');
        for (const other of slugs()) {
          if (other === slug) continue;
          if (new RegExp(`from\\s+['"][^'"]*(modules/${other}|\\.\\./${other})`).test(src)) {
            offenders.push(`${relative(repoRoot, file)} -> ${other}`);
          }
        }
      }
    }
    expect(offenders).toStrictEqual([]);
  });
});
