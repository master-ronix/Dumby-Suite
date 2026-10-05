import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
const files = execSync("find spec blueprint documentation -name '*.md' 2>/dev/null || true").toString().trim().split('\n').filter(Boolean);
const ids=new Set(); let bad=0;
for(const f of files){ const t=readFileSync(f,'utf8'); const m=t.match(/^id:\s*(.+)$/m); if(m){ if(ids.has(m[1])){console.error('FAIL: dup id '+m[1]);bad++;} ids.add(m[1]); } }
if(bad) process.exit(1); console.log(`OK: ${ids.size} unique ids`);
