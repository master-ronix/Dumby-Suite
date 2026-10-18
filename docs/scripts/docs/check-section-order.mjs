// Gate: section-order completeness. `status/section-order.json` is the canonical reading
// order per directory; every directory it lists must list every `.md` file that directory
// holds, and no entry may name a file that does not exist. This closes the class where a
// normative file is absent from the reading order and no gate can see it
// (UR-20261018-092 DR-6 / R7).
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const so = JSON.parse(readFileSync('status/section-order.json', 'utf8')).departments;
let bad = 0;
for (const [dept, listed] of Object.entries(so)) {
  if (!existsSync(dept)) {
    console.error(`FAIL: section-order lists a directory that does not exist: ${dept}`);
    bad++;
    continue;
  }
  const actual = readdirSync(dept).filter((f) => f.endsWith('.md'));
  for (const f of actual) {
    if (!listed.includes(f)) {
      console.error(`FAIL: ${dept} holds ${f} but status/section-order.json omits it`);
      bad++;
    }
  }
  for (const f of listed) {
    if (!existsSync(`${dept}/${f}`)) {
      console.error(`FAIL: status/section-order.json lists ${dept}/${f} which does not exist`);
      bad++;
    }
  }
}
if (bad) process.exit(1);
console.log(`OK: section-order (every listed directory is complete and resolvable)`);
