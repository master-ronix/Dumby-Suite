// Gate: dynamic UR detection. UR records are provenance — they are discovered at run
// time (glob `upgradation/UR-*.md`), never held in a static list, and are deliberately
// EXCLUDED from status/coverage-ledger.json and status/entities.json (so a new UR never
// forces edits to a web of registry files). Each detected UR must:
//   - carry complete front-matter (id/title/kind/status/version, kind: ur);
//   - cite only corpus paths that resolve.
// Dropping a new `upgradation/UR-*.md` in is therefore a one-file operation.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'upgradation';
const UR = /^UR-.*\.md$/i;
const CORPUS_PREFIX = /^(spec|blueprint|documentation|contracts|status|adr|upgradation|prompts|orchestration|migration|archive)\//;

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => UR.test(f)).sort() : [];
let bad = 0;
for (const f of files) {
  const p = join(DIR, f);
  const t = readFileSync(p, 'utf8');
  if (!t.startsWith('---')) { console.error(`FAIL: ${p} missing front-matter`); bad++; continue; }
  const fm = t.split('---')[1] || '';
  for (const k of ['id:', 'title:', 'kind:', 'status:', 'version:']) {
    if (!fm.includes(k)) { console.error(`FAIL: ${p} missing front-matter key ${k}`); bad++; }
  }
  if (!/kind:\s*ur\b/i.test(fm)) { console.error(`FAIL: ${p} front-matter kind is not "ur"`); bad++; }
  for (const m of t.matchAll(/`([a-z][a-z0-9_./-]*)`/g)) {
    const ref = m[1];
    if (!CORPUS_PREFIX.test(ref)) continue;
    if (/[<>*…]/.test(ref)) continue;
    if (!existsSync(ref) && !existsSync(ref.replace(/\/$/, ''))) {
      console.error(`FAIL: ${p} references a path that does not resolve: \`${ref}\``); bad++;
    }
  }
}
if (bad) process.exit(1);
console.log(`OK: ur (${files.length} UR record(s) detected dynamically; front-matter valid; refs resolve)`);
