import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
// no normative doc may link into archive/
const files = execSync("find spec blueprint documentation -name '*.md' 2>/dev/null || true").toString().trim().split('\n').filter(Boolean);
let bad=0;
for(const f of files){ const t=readFileSync(f,'utf8'); if(/archive\/v4\.5\.1/.test(t)){console.error('FAIL: normative links archive: '+f);bad++;} }
if(bad) process.exit(1); console.log('OK: no normative -> archive links');
