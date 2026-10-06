// Gate: the coverage ledger is fully mapped AND every target it names exists on disk.
// (The targets[] array previously carried a dangling `upgradation/UR-…` path that no
// row used — a stale entry nothing checked.)
import { readFileSync, existsSync } from 'node:fs';
const l = JSON.parse(readFileSync('status/coverage-ledger.json', 'utf8'));
let bad = 0;
const un = l.rows.filter((r) => r.status !== 'mapped');
if (un.length) { console.error(`FAIL: ${un.length} unmapped`); bad++; }
if (l.mapped !== l.total_rows) { console.error('FAIL: counts disagree'); bad++; }
for (const t of (l.targets || [])) if (!existsSync(t)) { console.error(`FAIL: ledger target does not exist: ${t}`); bad++; }
for (const r of l.rows) if (r.target && !existsSync(r.target)) { console.error(`FAIL: row target does not exist: ${r.target}`); bad++; }
if (bad) process.exit(1);
console.log(`OK: ${l.total_rows} headings mapped, 0 orphans; all ${(l.targets || []).length} targets resolve`);
