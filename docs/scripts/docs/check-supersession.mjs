// Gate: ADR supersession reciprocity. If ADR-A carries `superseded_by: ADR-B`, then ADR-B
// must carry `supersedes` naming ADR-A — a supersession recorded one way is a half-record
// (UR-20261018-092 DR-8 / R8).
import { readFileSync, readdirSync } from 'node:fs';

const adrs = readdirSync('adr').filter((f) => /^ADR-\d+\.md$/.test(f));
const fm = {};
for (const f of adrs) {
  const body = readFileSync(`adr/${f}`, 'utf8').split('---')[1] || '';
  const id = (body.match(/^id:\s*(\S+)/m) || [])[1];
  if (!id) continue;
  const sby = (body.match(/^superseded_by:\s*(\S+)/m) || [])[1];
  const sup = (body.match(/^supersedes:\s*(.+)$/m) || [])[1];
  fm[id] = { sby, sup: sup || '' };
}
let bad = 0;
for (const [id, v] of Object.entries(fm)) {
  if (!v.sby) continue;
  const target = fm[v.sby];
  if (!target) {
    console.error(`FAIL: ${id} is superseded_by ${v.sby}, which does not exist`);
    bad++;
  } else if (!target.sup.includes(id)) {
    console.error(`FAIL: ${id} is superseded_by ${v.sby} but ${v.sby} carries no supersedes naming ${id}`);
    bad++;
  }
}
if (bad) process.exit(1);
console.log('OK: supersession (ADR supersession is reciprocal)');
