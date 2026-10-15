// Gate: numbers are single-sourced from status/counts.json AND the verifiable ones match
// the corpus. (A count never checked against its source is not enforced.)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const c = JSON.parse(readFileSync('status/counts.json', 'utf8'));
const required = ['bootstrap_stages','shutdown_steps','middleware_stages','rbac_layers','ranks','grant_types',
  'module_tiers','license_states','core_commands','adrs','ur_requests','deferred_greenfield'];
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
if (existsSync('../apps/main/src/bootstrap/stages.ts')) {
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
if (existsSync('../apps/main/src/middleware/built-in')) {
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

let bad = 0;
for (const [k, declared, actual, src] of checks)
  if (declared !== actual) { console.error(`FAIL: counts.${k}=${declared} but ${src} says ${actual}`); bad++; }
if (bad) process.exit(1);

const usesN = execSync("grep -rl '{{counts.' spec 2>/dev/null || true").toString().trim().split('\n').filter(Boolean).length;
if (usesN === 0) { console.error('FAIL: no {{counts.*}} tokens used in spec'); process.exit(1); }
console.log(`OK: counts single-sourced (${required.length} keys; ${checks.length} verified against source; ${usesN} sections use tokens)`);
