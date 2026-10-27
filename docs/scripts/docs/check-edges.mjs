// Gate: every path-like target in a corpus `Edges (-> ...)` line resolves on disk.
// Previously a dangling `status/compliance.json` edge passed unnoticed for months
// because edges lines were never validated as paths. This closes that gap.
//
// A target is treated as a PATH when it is prefixed with a known corpus directory
// or ends in a document/contract extension; targets that are document IDs
// (e.g. SPEC-02-ARCHITECTURE) or prose ("all departments") are ignored.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['blueprint/', 'documentation/', 'spec/', 'contracts/', 'status/', 'archive/v5.0.0-records/adr/',
  'archive/', '_inbox/', '_generated/', '_meta/', 'orchestration/', 'migration/',
  'upgradation/', 'prompts/', 'scripts/'];
const EXT = /\.(md|json|ya?ml)$/;

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
};

let bad = 0, checked = 0;
const files = [...walk('spec'), ...walk('blueprint'), ...walk('documentation')];
for (const f of files) {
  readFileSync(f, 'utf8').split('\n').forEach((ln, i) => {
    const m = ln.match(/->\s*([^\s()]+)/g); // every "-> target" on the line
    if (!m) return;
    for (const raw of m) {
      const t = raw.replace(/^->\s*/, '').trim();
      const isPath = DIRS.some((d) => t.startsWith(d)) || EXT.test(t);
      if (!isPath) continue;
      checked++;
      const rel = t.replace(/\/$/, '');
      if (!existsSync(rel)) { console.error(`FAIL: edge target missing in ${f}:${i + 1}: ${t}`); bad++; }
    }
  });
}
if (bad) process.exit(1);
console.log(`OK: edges (${checked} path-like edge target(s) resolve)`);
