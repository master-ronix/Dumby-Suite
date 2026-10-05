import { readFileSync, existsSync } from 'node:fs';
const m = JSON.parse(readFileSync('manifest.json','utf8'));
let bad = 0;
for (const d of m.documents) if (!existsSync(d.path)) { console.error(`FAIL: ${d.path}`); bad++; }
for (const c of m.contracts) if (!existsSync(c)) { console.error(`FAIL: ${c}`); bad++; }
if (bad) process.exit(1);
console.log('OK: manifest resolves');
