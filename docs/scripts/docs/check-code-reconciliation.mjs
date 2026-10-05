// Gate: docs<->code reconciliation ledger is well-formed and internally consistent.
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync('status/code-reconciliation.json', 'utf8'));
const allow = new Set(d.verdicts);
let bad = 0;
const tally = {};
for (const f of d.facts) {
  for (const k of ['id', 'area', 'doc_claim', 'code_truth', 'code_ref', 'verdict']) {
    if (!f[k]) { console.error(`FAIL: ${f.id ?? '?'} missing ${k}`); bad++; }
  }
  if (!allow.has(f.verdict)) { console.error(`FAIL: ${f.id} bad verdict ${f.verdict}`); bad++; }
  tally[f.verdict] = (tally[f.verdict] ?? 0) + 1;
}
for (const [k, v] of Object.entries(d.counts)) {
  if (k === 'total') { if (v !== d.facts.length) { console.error(`FAIL: total ${v} != ${d.facts.length}`); bad++; } }
  else if ((tally[k] ?? 0) !== v) { console.error(`FAIL: count ${k} ${v} != ${tally[k] ?? 0}`); bad++; }
}
if (bad) process.exit(1);
console.log(`OK: code-reconciliation (${d.facts.length} facts, counts consistent)`);
