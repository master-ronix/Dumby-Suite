// Gate: generated-artefact freshness. `_generated/tree.md` and `_generated/index.md` are
// declared generated artefacts in manifest.json; this gate proves both are current.
//   - tree.md must list exactly the files under docs/ (relative paths, one per line, `- <path>`).
//   - index.md must contain a row for every manifest document path and every manifest asset
//     (UR-20261019-095 — closes the DR-1 gap where index.md was declared generated but ungated).
// A stale or partial listing fails the gate, so a generated artefact can no longer rot silently.
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

// UR-20261019-095 — _generated/index.md must cover every manifest document and asset.
{
  const m = JSON.parse(readFileSync('manifest.json', 'utf8'));
  const idx = readFileSync('_generated/index.md', 'utf8');
  const required = [
    ...(m.documents || []).map((d) => d.path),
    ...Object.values(m.assets || {}),
  ];
  const absent = required.filter((p) => !idx.includes(p.replace(/\/$/, '')));
  if (absent.length) {
    console.error(`FAIL: _generated/index.md omits ${absent.length} manifest path(s): ${absent.join(', ')}`);
    bad++;
  }
}

if (bad) process.exit(1);
console.log(`OK: generated (tree.md lists exactly the ${files.length} files under docs/; index.md covers the manifest)`);
