// Gate: side-document consistency. The corpus has side documents that sit OUTSIDE the traced
// corpus (the build manifest, the migration ledger, the request register) plus reader-facing
// files, and they restate status — so they drift. This gate holds these invariants:
//   1. no side document restates the UR count as a bare number (read it from check-ur.mjs);
//   2. the build manifest's "Branch / ref" names the commit the reconciliation ledger verified at;
//   3. every restated documentation-gate count equals the real number of check-*.mjs gates
//      (UR-20261015-090 R4);
//   4. provenance unification: the current-provenance surfaces name ONE commit, the audit-age
//      ledger names that commit and branch, and (with a git work tree) the named branch resolves
//      to that commit (UR-20261016-091 R3/R4; UR-20261018-092 DR-2/DR-3/DR-4);
//   5. the tree entry counts are single-sourced via {{counts.tree_*}} tokens, not hand-transcribed
//      (UR-20261018-092 DR-11 / R2).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

let bad = 0;

// 1. no restated UR count in the side documents
const SIDE = ['../GAP_MANIFEST.md', '../migration-ledger.md', 'upgradation/README.md', 'migration/migration-prompt.md'];
const COUNT = /\b\d+\s+(?:UR\s+)?records?\b/i;
for (const f of SIDE) {
  if (!existsSync(f)) continue;
  const m = readFileSync(f, 'utf8').match(COUNT);
  if (m) {
    console.error(`FAIL: ${f} restates a record count ("${m[0]}") — read the live count from check-ur.mjs`);
    bad++;
  }
}

// 2. the build manifest's ref matches the reconciliation ledger's verified commit
const gm = '../GAP_MANIFEST.md';
if (existsSync(gm)) {
  const rec = JSON.parse(readFileSync('status/code-reconciliation.json', 'utf8'));
  const ref = readFileSync(gm, 'utf8').match(/\*\*Branch \/ ref:\*\*[^\n]*?`([0-9a-f]{40})`/);
  if (ref && rec.verified_commit && ref[1] !== rec.verified_commit) {
    console.error(
      `FAIL: GAP_MANIFEST Branch/ref ${ref[1].slice(0, 7)} != reconciliation verified_commit ${rec.verified_commit.slice(0, 7)}`,
    );
    bad++;
  }
}

// 3. restated documentation-gate counts match the real gate count
const gateCount = readdirSync('scripts/docs').filter((f) => /^check-.*\.mjs$/.test(f)).length;
const GATE_CLAIM = [
  /(\d+)\s*\/\s*\d+\s*gates/gi,
  /(\d+)\s+documentation gates/gi,
  /gate-verified\s*\((\d+)\s*\/\s*\d+\)/gi,
  /Run all (\d+) gates/gi,
  /(\d+)\s+gates,\s*all\s+green/gi,
];
for (const f of ['../STATUS.md', '../GAP_MANIFEST.md', 'README.md']) {
  if (!existsSync(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const re of GATE_CLAIM) {
    for (const m of text.matchAll(re)) {
      if (Number(m[1]) !== gateCount) {
        console.error(`FAIL: ${f} claims ${m[1]} documentation gates ("${m[0].trim()}") but ${gateCount} check-*.mjs gates exist`);
        bad++;
      }
    }
  }
}

// 3b. the change-log head states a *current* gate count, and it must match too
{
  const f = 'upgradation/change-log.md';
  if (existsSync(f)) {
    const head = readFileSync(f, 'utf8').split('\n').slice(0, 90).join('\n');
    for (const re of GATE_CLAIM) {
      for (const m of head.matchAll(re)) {
        if (Number(m[1]) !== gateCount) {
          console.error(`FAIL: ${f} (head) claims ${m[1]} documentation gates ("${m[0].trim()}") but ${gateCount} check-*.mjs gates exist`);
          bad++;
        }
      }
    }
  }
}

// 4. provenance unification + audit-age + branch resolution
{
  const rec = JSON.parse(readFileSync('status/code-reconciliation.json', 'utf8'));
  const canonical = rec.verified_commit;
  const STALE = ['8355ba4f', '039da060', '6fd4df9d'];
  for (const f of ['../GAP_MANIFEST.md', 'status/code-reconciliation.json', 'migration/migration-prompt.md', 'README.md']) {
    if (!existsSync(f)) continue;
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\b[0-9a-f]{40}\b/g)) {
      if (m[0] !== canonical) {
        console.error(`FAIL: ${f} names commit ${m[0].slice(0, 7)} — not the canonical ${canonical.slice(0, 7)}`);
        bad++;
      }
    }
    for (const s of STALE) {
      if (text.includes(s)) {
        console.error(`FAIL: ${f} carries the stale commit literal ${s}`);
        bad++;
      }
    }
  }
  // the audit-age ledger must name the canonical commit and the same branch (DR-3/DR-4)
  if (existsSync('status/audit-age.json')) {
    const aa = JSON.parse(readFileSync('status/audit-age.json', 'utf8')).last_audit || {};
    if (aa.commit !== canonical) {
      console.error(`FAIL: status/audit-age.json audit commit ${String(aa.commit).slice(0, 7)} != reconciliation verified_commit ${canonical.slice(0, 7)}`);
      bad++;
    }
    if (aa.branch !== rec.verified_branch) {
      console.error(`FAIL: status/audit-age.json branch "${aa.branch}" != reconciliation verified_branch "${rec.verified_branch}"`);
      bad++;
    }
  }
  // with a git work tree, the named branch must resolve to the named SHA
  if (existsSync('../.git')) {
    try {
      const sha = execSync(`git rev-parse ${rec.verified_branch}`, { cwd: '..', stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      if (sha && sha !== canonical) {
        console.error(`FAIL: ${rec.verified_branch} resolves to ${sha.slice(0, 7)}, not the canonical ${canonical.slice(0, 7)}`);
        bad++;
      }
    } catch {
      /* ref not present locally — notice only */
    }
  }
}

// 5. the tree entry counts are single-sourced tokens, not hand-transcribed literals
for (const f of ['blueprint/structure.md', 'spec/architecture/directory-file-structure.md']) {
  if (!existsSync(f)) continue;
  const text = readFileSync(f, 'utf8');
  if (!text.includes('{{counts.tree_entries}}')) {
    console.error(`FAIL: ${f} does not single-source the tree entry counts via {{counts.tree_entries}}`);
    bad++;
  }
  if (/([\d,]+)\s+entries\s*:\s*[\d,]+\s+directories,\s*[\d,]+\s+files/.test(text)) {
    console.error(`FAIL: ${f} still carries a hand-transcribed tree count literal`);
    bad++;
  }
}
// the build manifest's code counts are single-sourced too (UR-20261018-092 FD-2)
if (existsSync(gm)) {
  const t = readFileSync(gm, 'utf8');
  if (!t.includes('{{counts.code_migrations}}')) {
    console.error('FAIL: GAP_MANIFEST.md does not single-source its code counts via {{counts.*}}');
    bad++;
  }
}

if (bad) process.exit(1);
console.log(
  `OK: side-docs (no restated UR count; manifest ref matches the ledger; ${gateCount} gate count consistent; provenance + audit-age unified; tree counts single-sourced)`,
);
