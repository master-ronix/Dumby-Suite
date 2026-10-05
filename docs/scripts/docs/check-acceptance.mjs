// Gate: every spec section has an acceptance block whose ids match its front-matter.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const files = execSync("find spec -name '*.md' 2>/dev/null || true").toString().trim().split('\n').filter(Boolean);
let bad=0, blocks=0, checks=0;
for (const f of files) {
  const t = readFileSync(f,'utf8');
  const m = t.match(/```acceptance\n([\s\S]*?)```/);
  if (!m) { console.error('FAIL: no acceptance block: '+f); bad++; continue; }
  blocks++;
  const ids = [...m[1].matchAll(/^- id:\s*(\S+)/gm)].map(x=>x[1]);
  checks += ids.length;
  const fm = t.split('---')[1] || '';
  const fmIds = (fm.match(/^acceptance:\s*\[(.*)\]/m)||[,''])[1].split(',').map(s=>s.trim()).filter(Boolean);
  for (const id of ids) if (!fmIds.includes(id)) { console.error(`FAIL: ${f} front-matter missing ${id}`); bad++; }
}
if (bad) process.exit(1);
console.log(`OK: ${blocks} sections, ${checks} acceptance checks, ids consistent`);
