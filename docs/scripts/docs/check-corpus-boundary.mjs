// Gate: corpus boundary. `apps/main/docs/` is an application-local, NON-NORMATIVE set — it is
// OUTSIDE the corpus and its gates. This gate keeps that boundary explicit and prevents the second
// tree from masquerading as corpus content (the F7 finding of the 2026-10-11 corpus audit):
//   1. docs/README.md must document the boundary (name `apps/main/docs`);
//   2. no file under apps/main/docs/ may carry a corpus front-matter block (a leading `---`),
//      which is how corpus membership is expressed;
//   3. the normative ADR series is archive/v5.0.0-records/adr/ (front-mattered, kind: adr).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let bad = 0;

// 1. the boundary is documented
const readme = readFileSync('README.md', 'utf8');
if (!readme.includes('apps/main/docs')) {
  console.error('FAIL: docs/README.md does not document the apps/main/docs boundary');
  bad++;
}

// 2. no corpus front-matter under the second tree
const ALT = join('..', 'apps', 'main', 'docs');
function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}
for (const f of walk(ALT)) {
  if (readFileSync(f, 'utf8').startsWith('---')) {
    console.error(`FAIL: ${f} carries a corpus front-matter block (the second tree must stay non-corpus)`);
    bad++;
  }
}

// 3. the normative ADR series lives in archive/v5.0.0-records/adr/ and is front-mattered
const adrs = readdirSync('archive/v5.0.0-records/adr').filter((f) => /^ADR-\d+\.md$/.test(f));
if (adrs.length === 0) {
  console.error('FAIL: archive/v5.0.0-records/adr carries no ADR-*.md records');
  bad++;
}
for (const f of adrs) {
  const t = readFileSync(join('archive/v5.0.0-records/adr', f), 'utf8');
  if (!t.startsWith('---') || !/kind:\s*adr/.test(t)) {
    console.error(`FAIL: adr/${f} is not a front-mattered adr record`);
    bad++;
  }
}

if (bad) process.exit(1);
console.log(`OK: corpus-boundary (apps/main/docs stays non-corpus; ${adrs.length} normative ADRs in adr/)`);
