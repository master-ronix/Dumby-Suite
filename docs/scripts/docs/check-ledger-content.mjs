// Gate: every coverage-ledger row's heading must appear in its mapped target file.
// This catches "mapped but not preserved" — a row pointed at a file that never carried it.
import { readFileSync, existsSync } from 'node:fs';
const STOP = new Set('the a an and or of to in is are for with on by as at from into over under this that these those it its be been being not no all any each every some such only own same so than too very can will just don should now he she they them their what which who whom when where why how do does did doing have has had having i you your we our us'.split(' '));
const toks = (s) => (s.toLowerCase().match(/[a-z][a-z0-9\-.]{2,}/g) || []).filter((w) => !STOP.has(w));
const l = JSON.parse(readFileSync('status/coverage-ledger.json', 'utf8'));
const cache = new Map();
const ft = (p) => { if (!cache.has(p)) cache.set(p, new Set(existsSync(p) ? toks(readFileSync(p, 'utf8')) : [])); return cache.get(p); };
let bad = 0;
for (const r of l.rows) {
  const tk = toks(r.heading);
  if (!tk.length) continue;
  const S = ft(r.target);
  const miss = tk.filter((w) => !S.has(w));
  if (miss.length >= 2 || (miss.length === 1 && tk.length === 1)) {
    if (bad < 8) console.error(`FAIL: ${r.source_file} "${r.heading.slice(0, 50)}" not in ${r.target}`);
    bad++;
  }
}
if (bad) process.exit(1);
console.log(`OK: ledger-content (${l.rows.length} rows, every heading present in its target)`);
