// Gate: an aside or example is never presented as the rule. Inside a section whose heading
// is a non-normative marker (Design Consideration / Note / Example / Aside / Illustrative /
// Non-normative), no line may carry a normative keyword (MUST / SHALL / REQUIRED).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['blueprint', 'documentation', 'spec', 'archive/v5.0.0-records/adr', 'upgradation'];
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
const HEAD = /^#{1,6}\s/;
const MARK = /(design consideration|\bnote\b|\bexample\b|\baside\b|illustrative|non-normative)/i;
const NORM = /\b(MUST|SHALL|REQUIRED)\b/;
let bad = 0, sections = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  let marked = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (HEAD.test(ln)) { marked = MARK.test(ln); if (marked) sections++; continue; }
    if (marked && NORM.test(ln)) {
      console.error(`FAIL: normative keyword inside non-normative section ${f.replace(/\\/g, '/')}:${i + 1}: ${ln.trim().slice(0, 70)}`);
      bad++;
    }
  }
}
if (bad) process.exit(1);
console.log(`OK: normative-markers (${sections} non-normative sections carry no MUST/SHALL/REQUIRED)`);
