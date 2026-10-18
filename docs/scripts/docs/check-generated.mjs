// Gate: generated-artefact freshness. `_generated/tree.md` is declared a generated artefact
// in manifest.json; this gate proves it is current — it must list exactly the files under
// docs/ (relative paths, one per line, `- <path>`). A stale listing fails the gate, so a
// generated artefact can no longer rot silently (UR-20261018-092 DR-1 / R1-R2).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', '.cache', '.local']);
const files = [];
const walk = (dir, rel) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(join(dir, e.name), r);
    else files.push(r);
  }
};
walk('.', '');
files.sort();

let bad = 0;
const listed = readFileSync('_generated/tree.md', 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('- '))
  .map((l) => l.slice(2).trim());
const setListed = new Set(listed);
const setTree = new Set(files);

const missing = files.filter((f) => !setListed.has(f));
const extra = listed.filter((f) => !setTree.has(f));
if (missing.length) {
  console.error(`FAIL: _generated/tree.md omits ${missing.length} file(s) the tree holds, e.g. ${missing.slice(0, 3).join(', ')}`);
  bad++;
}
if (extra.length) {
  console.error(`FAIL: _generated/tree.md lists ${extra.length} file(s) the tree does not hold, e.g. ${extra.slice(0, 3).join(', ')}`);
  bad++;
}
if (listed.length !== files.length) {
  console.error(`FAIL: _generated/tree.md lists ${listed.length} entries but the tree holds ${files.length} files`);
  bad++;
}
if (bad) process.exit(1);
console.log(`OK: generated (tree.md lists exactly the ${files.length} files under docs/)`);
