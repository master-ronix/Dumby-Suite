import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainEntry } from '../entry/is-main-entry.js';

/**
 * Appendix C #18 — the admin CLI. A small, argv-driven operator tool over the module packages and
 * the operational runbooks. Pure `runCli` for testability; the entrypoint guard builds the deps.
 */
export interface CliDeps {
  readonly modules: { list(): { slug: string; tier: string }[] };
  readonly operational: { runbooks(): string[]; status(): unknown };
}

export async function runCli(
  argv: readonly string[],
  deps: CliDeps,
  out: (line: string) => void = console.log,
): Promise<number> {
  const [group, action] = argv;
  if (group === 'modules' && action === 'list') {
    for (const m of deps.modules.list()) out(`${m.slug}\t${m.tier}`);
    return 0;
  }
  if (group === 'status') {
    out(JSON.stringify(deps.operational.status(), null, 2));
    return 0;
  }
  if (group === 'runbooks') {
    for (const r of deps.operational.runbooks()) out(r);
    return 0;
  }
  out('usage: cli <modules list | status | runbooks>');
  return 1;
}

function listFirstPartyModules(dir: string): { slug: string; tier: string }[] {
  if (!existsSync(dir)) return [];
  const out: { slug: string; tier: string }[] = [];
  for (const slug of readdirSync(dir)) {
    const manifestPath = join(dir, slug, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { tier?: string };
      out.push({ slug, tier: manifest.tier ?? 'standard' });
    } catch {
      out.push({ slug, tier: 'standard' });
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function main(): Promise<void> {
  const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
  const deps: CliDeps = {
    modules: { list: () => listFirstPartyModules(join(repoRoot, 'packages/modules')) },
    operational: {
      runbooks: () => {
        const dir = join(repoRoot, 'apps/main/docs/runbooks');
        return existsSync(dir)
          ? readdirSync(dir)
              .filter((f) => f.endsWith('.md') && f !== 'README.md')
              .sort()
          : [];
      },
      status: () => ({ modules: listFirstPartyModules(join(repoRoot, 'packages/modules')) }),
    },
  };
  process.exit(await runCli(process.argv.slice(2), deps));
}

if (isMainEntry(import.meta.url, process.argv[1])) {
  void main();
}
