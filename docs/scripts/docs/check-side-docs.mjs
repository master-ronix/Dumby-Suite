// Gate: side-document consistency. The corpus has side documents that sit OUTSIDE the traced
// corpus (the build manifest, the migration ledger, the request register). They restate status, so
// they drift — the F1/F2/F5/F9 class of the 2026-10-11 corpus audit, invisible to the traced-corpus
// gates. This gate holds two invariants:
//   1. no side document restates the UR count as a bare number (read it from check-ur.mjs instead);
//   2. the build manifest's "Branch / ref" names the commit the reconciliation ledger was verified at.
import { readFileSync, existsSync } from 'node:fs';

let bad = 0;

// 1. no restated UR count in the side documents
const SIDE = ['../GAP_MANIFEST.md', '../migration-ledger.md', 'upgradation/README.md'];
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

if (bad) process.exit(1);
console.log('OK: side-docs (no restated UR count; manifest ref matches the reconciliation ledger)');
