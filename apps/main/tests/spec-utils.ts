import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Shared helpers for the declared acceptance (`*.spec.ts`) suite. */
export const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const appRoot = join(repoRoot, 'apps/main');

export function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

export function readSrc(rel: string): string {
  return readFileSync(join(appRoot, 'src', rel), 'utf8');
}

export function existsRepo(rel: string): boolean {
  return existsSync(join(repoRoot, rel));
}

export function existsSrc(rel: string): boolean {
  return existsSync(join(appRoot, 'src', rel));
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

export interface SrcFile {
  path: string;
  source: string;
}

/** Every `.ts` file under `apps/main/src`, with its source. */
export function srcFiles(): SrcFile[] {
  return walk(join(appRoot, 'src'))
    .filter((p) => p.endsWith('.ts'))
    .map((p) => ({ path: p.slice(appRoot.length + 1), source: readFileSync(p, 'utf8') }));
}

/** Concatenated source of every `.ts` file under `apps/main/src`. */
export function srcText(): string {
  return srcFiles()
    .map((f) => f.source)
    .join('\n');
}

export function isDir(rel: string): boolean {
  const p = join(repoRoot, rel);
  return existsSync(p) && statSync(p).isDirectory();
}

export function listDir(rel: string): string[] {
  const p = join(repoRoot, rel);
  return existsSync(p) ? readdirSync(p).sort() : [];
}
