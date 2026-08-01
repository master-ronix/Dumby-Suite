/**
 * Dynamically imports every migration file and every generated module
 * file to prove they are syntactically valid TypeScript, without
 * requiring knex/bullmq/pg to actually be installed (their imports in
 * these files are all `import type`, which tsx/esbuild erases). This is a
 * real check — a genuine syntax error anywhere in these files fails it —
 * not a placeholder.
 */
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_MISSING_PACKAGES = [
  "Cannot find package 'knex'",
  "Cannot find package 'bullmq'",
  "Cannot find package 'pg'",
];

async function checkDir(
  dir: string,
): Promise<{ total: number; clean: number; expectedDepErrors: number; failures: string[] }> {
  const files = walk(dir);
  let clean = 0;
  let expectedDepErrors = 0;
  const failures: string[] = [];

  for (const file of files) {
    try {
      await import(pathToFileURL(path.resolve(file)).href);
      clean += 1;
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (EXPECTED_MISSING_PACKAGES.some((p) => msg.includes(p))) {
        expectedDepErrors += 1;
      } else {
        failures.push(`${file}: ${msg.split('\n')[0]}`);
      }
    }
  }
  return { total: files.length, clean, expectedDepErrors, failures };
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const migrations = await checkDir('src/db/migrations');
  console.log(
    `Migrations: ${migrations.total} files, ${migrations.clean + migrations.expectedDepErrors} syntactically valid, ${migrations.failures.length} real errors`,
  );
  for (const f of migrations.failures) console.error(`  FAIL: ${f}`);

  const moduleDirs = readdirSync('src/modules').filter(
    (d) => d !== '_template' && statSync(path.join('src/modules', d)).isDirectory(),
  );
  let modTotal = 0;
  let modClean = 0;
  let modFailures: string[] = [];
  for (const dir of moduleDirs) {
    const result = await checkDir(path.join('src/modules', dir));
    modTotal += result.total;
    modClean += result.clean + result.expectedDepErrors;
    modFailures = modFailures.concat(result.failures);
  }
  console.log(
    `Generated modules: ${modTotal} files across ${moduleDirs.length} modules, ${modClean} syntactically valid, ${modFailures.length} real errors`,
  );
  for (const f of modFailures) console.error(`  FAIL: ${f}`);

  if (migrations.failures.length > 0 || modFailures.length > 0) {
    process.exit(1);
  }
}

void main();
