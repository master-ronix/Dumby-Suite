// Gate: canonical facts hold across the corpus.
//   - no forbidden literal (a contradiction of a canonical fact) may appear;
//   - every required canonical fact must be present.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['blueprint', 'documentation', 'spec', 'archive/v5.0.0-records/adr'];
const F = JSON.parse(readFileSync('status/facts.json', 'utf8'));
const walk = (d) => {
  const out = [];
  if (!existsSync(d)) return out;
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
};
const files = DIRS.flatMap(walk);
const rel = (f) => f.replace(/\\/g, '/');
const lower = new Map(files.map((f) => [f, readFileSync(f, 'utf8').toLowerCase()]));
let bad = 0;
for (const f of files)
  for (const fl of F.forbidden_literals)
    if (lower.get(f).includes(fl.literal.toLowerCase())) { console.error(`FAIL: contradicting fact "${fl.literal}" in ${rel(f)} (canonical: ${fl.canonical})`); bad++; }
for (const r of F.required_literals)
  if (![...lower.values()].some((t) => t.includes(r.literal.toLowerCase()))) { console.error(`FAIL: canonical fact missing: ${r.literal}`); bad++; }
if (bad) process.exit(1);
console.log(`OK: facts (${files.length} files; ${F.forbidden_literals.length} contradictions absent; ${F.required_literals.length} canonical facts present)`);
