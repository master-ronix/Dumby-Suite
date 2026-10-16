// Gate: side-document consistency. The corpus has side documents that sit OUTSIDE the traced
// corpus (the build manifest, the migration ledger, the request register) plus reader-facing
// files, and they restate status — so they drift. This gate holds four invariants:
//   1. no side document restates the UR count as a bare number (read it from check-ur.mjs);
//   2. the build manifest's "Branch / ref" names the commit the reconciliation ledger verified at;
//   3. every restated documentation-gate count equals the real number of check-*.mjs gates
//      (UR-20261015-090 R4);
//   4. the tree entry counts in blueprint/structure.md and
//      spec/architecture/directory-file-structure.md match the tree (UR-20261015-090 R5).
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
  /(\d+)\s*\/\s*\d+\s*gates/gi, // e.g. "27 / 27 gates green"
  /(\d+)\s+documentation gates/gi, // e.g. "27 documentation gates"
  /gate-verified\s*\((\d+)\s*\/\s*\d+\)/gi, // e.g. "gate-verified (27/27)"
  /Run all (\d+) gates/gi, // e.g. "Run all 27 gates"
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

// 3b. the change-log head states a *current* gate count, and it must match too (UR-20261016-091 R6)
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

// 3c. provenance unification: the current-provenance surfaces may name ONE commit (UR-20261016-091 R3)
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
}

// 4. tree entry counts match the tree
function treeCounts(root) {
  let files;
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore', cwd: root });
    files = execSync('git ls-files', { cwd: root }).toString().trim().split('\n').filter(Boolean);
  } catch {
    const skip = new Set(['node_modules', '.git', 'dist', 'coverage', '.cache', '.local']);
    files = [];
    const walk = (dir, rel) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(e.name)) continue;
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) walk(join(dir, e.name), r);
        else files.push(r);
      }
    };
    walk(root, '');
  }
  const dirs = new Set();
  for (const f of files) {
    let d = dirname(f);
    while (d && d !== '.') {
      dirs.add(d);
      d = dirname(d);
    }
  }
  return { files: files.length, dirs: dirs.size, entries: files.length + dirs.size };
}
const tc = treeCounts('..');
const TREE_CLAIM = /([\d,]+)\s+entries(?:\s*:\s*|\s*\(\s*)([\d,]+)\s+directories,\s*([\d,]+)\s+files\)?/g;
const num = (s) => Number(s.replace(/,/g, ''));
for (const f of ['blueprint/structure.md', 'spec/architecture/directory-file-structure.md']) {
  if (!existsSync(f)) continue;
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(TREE_CLAIM)) {
    const [e, d, fl] = [num(m[1]), num(m[2]), num(m[3])];
    if (e !== tc.entries || d !== tc.dirs || fl !== tc.files) {
      console.error(
        `FAIL: ${f} claims ${e} entries (${d} dirs, ${fl} files) but the tree is ${tc.entries} entries (${tc.dirs} dirs, ${tc.files} files)`,
      );
      bad++;
    }
  }
}

if (bad) process.exit(1);
console.log(
  `OK: side-docs (no restated UR count; manifest ref matches the ledger; ${gateCount} gate count consistent; tree counts match)`,
);
