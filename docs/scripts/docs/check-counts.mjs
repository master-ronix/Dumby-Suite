// Gate: numbers are single-sourced from status/counts.json AND the verifiable ones match
// the corpus. (A count never checked against its source is not enforced.)
//
// UR-20261019-094 — hermeticity. Several checks depend on inputs OUTSIDE docs/ (apps/main source).
// Previously an absent input caused a SILENT skip while the gate still printed OK and exited 0 —
// a fail-open. Now every skip is explicit and counted, and under CI an absent canonical input is a
// hard failure. A gate must never be unable to distinguish "verified" from "not run".
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

const CI = !!process.env.CI;
const skips = [];
function requireInput(path, label) {
  if (existsSync(path)) return true;
  skips.push(`${label} (${path})`);
  if (CI) {
    console.error(`FAIL: counts — canonical input absent under CI: ${label} (${path})`);
    process.exit(1);
  }
  return false;
}

const c = JSON.parse(readFileSync('status/counts.json', 'utf8'));
const required = ['bootstrap_stages','shutdown_steps','middleware_stages','rbac_layers','ranks','grant_types',
  'module_tiers','license_states','core_commands','adrs','ur_requests','deferred_greenfield',
  'tree_entries','tree_dirs','tree_files','code_ts_files','code_src_ts_files','code_migrations'];
const missing = required.filter(k => !(k in c));
if (missing.length) { console.error('FAIL: counts.json missing ' + missing.join(',')); process.exit(1); }

const m = JSON.parse(readFileSync('manifest.json', 'utf8'));
if (m.counts_source !== 'status/counts.json') { console.error('FAIL: manifest.counts_source not wired'); process.exit(1); }

const checks = [];
if (existsSync('adr')) {
  const n = readdirSync('adr').filter(f => /^ADR-\d+\.md$/.test(f)).length;
  checks.push(['adrs', c.adrs, n, 'adr/ADR-*.md files']);
}
if (existsSync('contracts/commands.json')) {
  const d = JSON.parse(readFileSync('contracts/commands.json', 'utf8'));
  const n = (d.commands || d.items || []).length;
  if (n) checks.push(['core_commands', c.core_commands, n, 'contracts/commands.json']);
}
if (existsSync('contracts/module-manifest.schema.json')) {
  const s = readFileSync('contracts/module-manifest.schema.json', 'utf8');
  const mm = s.match(/"enum"\s*:\s*\[([^\]]*admin[^\]]*)\]/);
  if (mm) checks.push(['module_tiers', c.module_tiers, (mm[1].match(/"/g) || []).length / 2, 'manifest schema tier enum']);
}
if (existsSync('spec/foundations/engineering-principles-p1-p14.md')) {
  const t = readFileSync('spec/foundations/engineering-principles-p1-p14.md', 'utf8');
  checks.push(['engineering_principles', c.engineering_principles, new Set(t.match(/\bP[0-9]{1,2}\b/g) || []).size, 'principles spec']);
}
if (existsSync('spec/governance/appendix-c-logged-deviations-and-open-items.md')) {
  const t = readFileSync('spec/governance/appendix-c-logged-deviations-and-open-items.md', 'utf8');
  const n = (t.match(/^\| [0-9]+ \|/gm) || []).length;
  if (n) checks.push(['logged_deviations', c.logged_deviations, n, 'appendix-c deviation table']);
}
if (existsSync('status/coverage-ledger.json') && 'coverage_rows' in c) {
  const l = JSON.parse(readFileSync('status/coverage-ledger.json', 'utf8'));
  checks.push(['coverage_rows', c.coverage_rows, l.total_rows, 'coverage-ledger.json']);
}
// UR-20261015-090 R8 — verify every remaining key that has a local source.
if (requireInput('../apps/main/src/bootstrap/stages.ts', 'apps/main bootstrap stages')) {
  const t = readFileSync('../apps/main/src/bootstrap/stages.ts', 'utf8');
  const arrLen = (name) => {
    const m = t.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`));
    return m ? (m[1].match(/'[^']+'/g) || []).length : 0;
  };
  const bs = arrLen('BOOTSTRAP_STAGES');
  if (bs) checks.push(['bootstrap_stages', c.bootstrap_stages, bs, 'stages.ts BOOTSTRAP_STAGES']);
  const ss = arrLen('SHUTDOWN_STEPS');
  if (ss) checks.push(['shutdown_steps', c.shutdown_steps, ss, 'stages.ts SHUTDOWN_STEPS']);
}
if (requireInput('../apps/main/src/middleware/built-in', 'apps/main built-in middleware')) {
  const n = readdirSync('../apps/main/src/middleware/built-in').filter(
    (f) => f.endsWith('.ts') && f !== 'index.ts',
  ).length;
  if (n) checks.push(['middleware_stages', c.middleware_stages, n, 'middleware/built-in/*.ts']);
}
if (existsSync('contracts/rbac.enums.json')) {
  const r = JSON.parse(readFileSync('contracts/rbac.enums.json', 'utf8'));
  if (r.layers) checks.push(['rbac_layers', c.rbac_layers, r.layers.length, 'contracts/rbac.enums.json layers']);
  if (r.ranks) checks.push(['ranks', c.ranks, r.ranks.length, 'contracts/rbac.enums.json ranks']);
  if (r.grant_types) checks.push(['grant_types', c.grant_types, r.grant_types.length, 'contracts/rbac.enums.json grant_types']);
}

// UR-20261018-092 DR-11 — tree counts are single-sourced and verified against the tree.
{
  const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', '.cache', '.local']);
  const files = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(dir, e.name), r);
      else files.push(r);
    }
  };
  walk('..', '');
  const dirs = new Set();
  for (const f of files) {
    let d = dirname(f);
    while (d && d !== '.') {
      dirs.add(d);
      d = dirname(d);
    }
  }
  checks.push(['tree_entries', c.tree_entries, files.length + dirs.size, 'the repository tree']);
  checks.push(['tree_dirs', c.tree_dirs, dirs.size, 'the repository tree']);
  checks.push(['tree_files', c.tree_files, files.length, 'the repository tree']);
}

// UR-20261018-092 FD-2 — the code counts are verified against the tree, not self-reported.
if (requireInput('../apps/main', 'apps/main source tree')) {
  let ts = 0;
  let srcTs = 0;
  const w = (dir, cb) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) w(p, cb);
      else cb(p);
    }
  };
  w('../apps/main', (p) => {
    if (p.endsWith('.ts')) {
      ts++;
      if (p.includes('/src/')) srcTs++;
    }
  });
  checks.push(['code_ts_files', c.code_ts_files, ts, 'apps/main *.ts']);
  checks.push(['code_src_ts_files', c.code_src_ts_files, srcTs, 'apps/main/src *.ts']);
  if (requireInput('../apps/main/src/db/migrations', 'apps/main db migrations')) {
    const mig = readdirSync('../apps/main/src/db/migrations').filter((f) => f.endsWith('.ts')).length;
    checks.push(['code_migrations', c.code_migrations, mig, 'apps/main/src/db/migrations/*.ts']);
  }
}

let bad = 0;
for (const [k, declared, actual, src] of checks)
  if (declared !== actual) { console.error(`FAIL: counts.${k}=${declared} but ${src} says ${actual}`); bad++; }
if (bad) process.exit(1);

const usesN = execSync("grep -rl '{{counts.' spec 2>/dev/null || true").toString().trim().split('\n').filter(Boolean).length;
if (usesN === 0) { console.error('FAIL: no {{counts.*}} tokens used in spec'); process.exit(1); }
const skipNote = skips.length ? `; ${skips.length} check(s) SKIPPED (input absent): ${skips.join('; ')}` : '';
console.log(`OK: counts single-sourced (${required.length} keys; ${checks.length} verified against source; ${usesN} sections use tokens)${skipNote}`);
