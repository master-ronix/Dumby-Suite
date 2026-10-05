// Gate: no retired code path may appear as a reference — in a status anchor, or in the
// corpus prose (except where the prose is *prohibiting* the path, which is legitimate).
//   RETIRED   = pre-rename / pre-ADR-005 locations that no longer exist anywhere.
//   PROHIBITED = a path the spec discusses only to forbid it (allowed in a negation context).
//   (Note: src/core/ is the CURRENT Application Core — never retired.)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RETIRED = ['apps/main/src/modules/', 'apps/main/src/renderer/'];
const PROHIBITED = ['src/modules/'];
const NEG = /\b(no|not|never|without|forbid|forbids|block|blocks|prohibit|in-tree|MUST NOT|instead of)\b/i;

let bad = 0, seen = 0;

const collect = (o, out) => {
  if (Array.isArray(o)) o.forEach((v) => collect(v, out));
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'head_anchor' || k === 'code_ref') && typeof v === 'string') out.push(v);
      collect(v, out);
    }
};
for (const f of ['status/reconciliation.json', 'status/code-reconciliation.json']) {
  if (!existsSync(f)) continue;
  const anchors = [];
  collect(JSON.parse(readFileSync(f, 'utf8')), anchors);
  for (const a of anchors) { seen++; for (const r of RETIRED) if (a.includes(r)) { console.error(`FAIL: retired path in ${f}: ${a}`); bad++; } }
}

const walk = (dir) => {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.md')) out.push(p);
  }
  return out;
};
for (const dir of ['spec', 'documentation', 'blueprint']) {
  for (const p of walk(dir)) {
    readFileSync(p, 'utf8').split('\n').forEach((ln, i) => {
      for (const r of RETIRED) if (ln.includes(r)) { console.error(`FAIL: retired path "${r}" in ${p}:${i + 1}`); bad++; }
      for (const r of PROHIBITED) if (ln.includes(r) && !NEG.test(ln)) { console.error(`FAIL: prohibited path "${r}" used positively in ${p}:${i + 1}`); bad++; }
    });
  }
}
if (bad) process.exit(1);
console.log(`OK: ${seen} anchors + corpus prose, none retired`);
