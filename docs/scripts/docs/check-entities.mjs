// Gate: every named entity in the frozen inventory (status/entities.json) must be
// present in the reader-facing corpus. This is the enforcement of "every named entity
// preserved" — the coverage ledger checks headings; this checks identifiers.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['blueprint', 'documentation', 'spec', 'adr', 'upgradation'];
const E = JSON.parse(readFileSync('status/entities.json', 'utf8'));

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

const files = DIRS.flatMap(walk);
const corpus = files.map((f) => readFileSync(f, 'utf8')).join('\n');
const inBackticks = new Set([...corpus.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]));

let bad = 0;
for (const { entity } of E.entities) {
  if (!inBackticks.has(entity) && !corpus.includes(entity)) {
    if (bad < 25) console.error(`FAIL: named entity not preserved: ${entity}`);
    bad++;
  }
}
if (bad) process.exit(1);
console.log(`OK: entities (${E.entities.length} named entities preserved across ${files.length} files)`);
