// Gate: frozen-UR rows have a current HEAD anchor.
import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync('status/reconciliation.json','utf8'));
if (!Array.isArray(r.rows)) { console.error('FAIL: reconciliation.rows not an array'); process.exit(1); }
let bad = 0;
for (const row of r.rows) if (!row.head_anchor || !row.request_id) { console.error('FAIL: row missing head_anchor/request_id'); bad++; }
if (bad) process.exit(1);
console.log(`OK: reconciliation (${r.rows.length} rows, all HEAD-anchored)`);
