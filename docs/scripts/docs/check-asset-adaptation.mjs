// Gate: no ASSET (prompt/orchestration/migration) may reference a RETIRED document name —
// the old single-file corpus that no longer exists. Assets must point at the restructured
// homes (spec/<dept>/, blueprint/, documentation/, upgradation/, adr/, ...).
//
// Precision notes:
//  - A retired name is flagged only when it is NOT part of a longer path, so the NEW homes
//    (`upgradation/change-log.md`, `spec/orientation/definitions.md`) are allowed.
//  - `upgradation/` is NOT scanned: the change log and the frozen UR records are historical
//    provenance and legitimately name the old corpus.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RETIRED = /(?<![/\w-])(blueprint|directive|interface|directory|concept|definitions|change-log)\.md\b|docs\/(ur|adr)\//;

const dirs = ['prompts', 'orchestration', 'migration'];
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

let bad = 0, checked = 0;
for (const d of dirs) {
  for (const p of walk(d)) {
    checked++;
    readFileSync(p, 'utf8').split('\n').forEach((ln, i) => {
      const m = ln.match(RETIRED);
      if (m) { console.error(`FAIL: ${p}:${i + 1} references retired doc "${m[0]}"`); bad++; }
    });
  }
}
if (bad) process.exit(1);
console.log(`OK: asset-adaptation (${checked} asset files, no retired doc references)`);
