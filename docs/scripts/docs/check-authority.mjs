// Gate: no scope has two authorities. Each registered claim phrase may appear only in its
// owning document among the reader-facing corpus; every other document must defer.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['blueprint', 'documentation', 'spec', 'archive/v5.0.0-records/adr'];
const A = JSON.parse(readFileSync('status/authority.json', 'utf8'));
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
let bad = 0;
for (const c of A.claims) {
  const needle = c.phrase.toLowerCase();
  for (const f of files) {
    if (rel(f) === c.owner) continue;
    if (readFileSync(f, 'utf8').toLowerCase().includes(needle)) {
      console.error(`FAIL: authority "${c.phrase}" claimed outside its owner in ${rel(f)} (owner: ${c.owner})`);
      bad++;
    }
  }
}
if (bad) process.exit(1);
console.log(`OK: authority (${A.claims.length} scopes, single owner each)`);
