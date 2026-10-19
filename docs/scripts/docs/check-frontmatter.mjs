import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const files = execSync("find spec blueprint documentation adr upgradation deploy -name '*.md' 2>/dev/null || true").toString().trim().split('\n').filter(Boolean);
let bad = 0;
for (const f of files) {
  const t = readFileSync(f,'utf8');
  if (!t.startsWith('---')) { console.error(`FAIL: ${f} missing front-matter`); bad++; continue; }
  const fm = t.split('---')[1] || '';
  for (const k of ['id:','title:','kind:','status:','version:']) if (!fm.includes(k)) { console.error(`FAIL: ${f} missing ${k}`); bad++; }
  // UR-20261019-097 — no empty ATX headings. A bare `####` renders as a blank heading and
  // contributes no anchor; a title belongs on the heading line.
  const empty = t.split('\n').filter((l) => /^#{1,6}\s*$/.test(l)).length;
  if (empty > 0) { console.error(`FAIL: ${f} has ${empty} empty ATX heading(s)`); bad++; }
}
if (bad) process.exit(1);
console.log(`OK: ${files.length} artifacts valid (front-matter complete; no empty ATX headings)`);
