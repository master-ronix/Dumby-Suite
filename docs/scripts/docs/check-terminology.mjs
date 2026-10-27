// Gate: terminology is canonical across the reader-facing corpus.
//   - no forbidden literal (a competing form of a canonical term) may appear;
//   - an alias may appear only in its allowed files (the explicit rename record);
//   - every required definition literal must be present (optionally in a named file).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['blueprint', 'documentation', 'spec', 'archive/v5.0.0-records/adr'];
const T = JSON.parse(readFileSync('status/terminology.json', 'utf8'));
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

for (const f of files) {
  const t = readFileSync(f, 'utf8');
  for (const fl of T.forbidden_literals)
    if (t.includes(fl.literal)) { console.error(`FAIL: forbidden term "${fl.literal}" in ${rel(f)} (canonical: ${fl.canonical})`); bad++; }
}
for (const a of T.alias_allowlist) {
  const rx = new RegExp(`\\b${a.alias}\\b`);
  for (const f of files) {
    if (a.allowed_in.some((x) => rel(f).endsWith(x))) continue;
    if (rx.test(readFileSync(f, 'utf8'))) { console.error(`FAIL: alias "${a.alias}" outside allowed files in ${rel(f)} (canonical: ${a.canonical})`); bad++; }
  }
}
for (const r of T.required_literals) {
  const scope = r.file ? [join(...r.file.split('/'))] : files;
  const present = scope.some((f) => existsSync(f) && readFileSync(f, 'utf8').includes(r.literal));
  if (!present) { console.error(`FAIL: required definition missing: ${r.literal}${r.file ? ' in ' + r.file : ''}`); bad++; }
}
if (bad) process.exit(1);
console.log(`OK: terminology (${files.length} files; ${T.forbidden_literals.length} forbidden absent; ${T.alias_allowlist.length} aliases scoped; ${T.required_literals.length} definitions present)`);
