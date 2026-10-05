import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const files = execSync("find spec blueprint documentation adr upgradation -name '*.md' 2>/dev/null || true").toString().trim().split('\n').filter(Boolean);
let bad = 0;
for (const f of files) {
  const t = readFileSync(f,'utf8');
  if (!t.startsWith('---')) { console.error(`FAIL: ${f} missing front-matter`); bad++; continue; }
  const fm = t.split('---')[1] || '';
  for (const k of ['id:','title:','kind:','status:','version:']) if (!fm.includes(k)) { console.error(`FAIL: ${f} missing ${k}`); bad++; }
}
if (bad) process.exit(1);
console.log(`OK: ${files.length} artifacts valid`);
