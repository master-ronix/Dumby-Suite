/**
 * Sandbox-honest verification. This is what actually ran while building
 * this repository, in a container with no Docker daemon and no
 * npm-registry network access (confirmed: `docker --version` ->
 * "not found"; `npm install` against the public registry -> 403
 * host_not_allowed). It does NOT claim to be the full verification
 * pipeline — for that, see scripts/verify-all.ts and STATUS_AND_VERIFICATION.md.
 *
 * What this script actually does:
 *   1. Runs the full node:test unit suite via tsx (zero npm installs
 *      needed — every file it touches either has no external runtime
 *      dependency, or only uses `import type` on one, which is erased).
 *   2. Import-checks every migration file and every generated module file
 *      for syntax errors (real dynamic import, not a regex scan).
 *   3. Regenerates the 22 modules from scripts/scaffold-module.ts and
 *      confirms the output is byte-identical to what's committed (proves
 *      the generator and the committed modules haven't drifted).
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function main(): void {
  section('1. Unit test suite (node --test via tsx)');
  const testOutput = execSync('npx tsx --test tests/unit/*.test.ts tests/unit/modules/*.test.ts', {
    encoding: 'utf8',
  });
  console.log(testOutput.split('\n').slice(-12).join('\n'));
  if (!/# fail 0/.test(testOutput)) {
    throw new Error('One or more unit tests failed — see output above.');
  }

  section('2. Migration + generated-module syntax check');
  execSync('npx tsx scripts/check-generated-syntax.ts', { stdio: 'inherit' });

  section('3. Module generator determinism');
  const before = snapshotModuleFiles();
  execSync('npx tsx scripts/scaffold-module.ts', { stdio: 'pipe' });
  const after = snapshotModuleFiles();
  if (before !== after) {
    throw new Error('Regenerating modules produced different output than what is committed.');
  }
  console.log('Regenerated output is byte-identical to the committed modules.');

  console.log('\nAll sandbox-verifiable checks passed.');
  console.log('NOT covered here (requires Docker + network; see verify-all.ts): install, docker compose up,');
  console.log('live Postgres/Redis, migrations against a real DB, seed, health/metrics/API HTTP checks.');
}

function snapshotModuleFiles(): string {
  const dirs = readdirSync('src/modules').filter(
    (d) => d !== '_template' && statSync(`src/modules/${d}`).isDirectory(),
  );
  let combined = '';
  for (const dir of dirs.sort()) {
    combined += walk(`src/modules/${dir}`);
  }
  return combined;
}

function walk(dir: string): string {
  let out = '';
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out += walk(full);
    else out += readFileSync(full, 'utf8');
  }
  return out;
}

main();
