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
if (existsSync('status/coverage-ledger.json') && 'coverage_rows' in c) {
  const l = JSON.parse(readFileSync('status/coverage-ledger.json', 'utf8'));
  checks.push(['coverage_rows', c.coverage_rows, l.total_rows, 'coverage-ledger.json']);
}

let bad = 0;
for (const [k, declared, actual, src] of checks)
  if (declared !== actual) { console.error(`FAIL: counts.${k}=${declared} but ${src} says ${actual}`); bad++; }
if (bad) process.exit(1);

const usesN = execSync("grep -rl '{{counts.' spec 2>/dev/null || true").toString().trim().split('\n').filter(Boolean).length;
if (usesN === 0) { console.error('FAIL: no {{counts.*}} tokens used in spec'); process.exit(1); }
console.log(`OK: counts single-sourced (${required.length} keys; ${checks.length} verified against source; ${usesN} sections use tokens)`);
