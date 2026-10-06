// Gate: no long normative line may be duplicated across spec sections.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const files = execSync("find spec -name '*.md'").toString().trim().split('\n').filter(Boolean);
const seen = new Map(); const dups = [];
for (const f of files) for (const raw of readFileSync(f,'utf8').split('\n')) {
  const s = raw.trim();
  if (s.length < 160 || s.startsWith('|') || s.startsWith('```') || s.slice(0,2)==='- ' || s.slice(0,2)==='* ') continue;
  if (seen.has(s)) dups.push(s.slice(0,60)); else seen.set(s,f);
}
if (dups.length) { console.error(`FAIL: ${dups.length} duplicated normative lines`); process.exit(1); }
console.log(`OK: no-restatement (0 duplicated lines across ${files.length} sections)`);
