import { readFileSync } from 'node:fs';
const l = JSON.parse(readFileSync('status/coverage-ledger.json','utf8'));
const un = l.rows.filter(r => r.status !== 'mapped');
if (un.length) { console.error(`FAIL: ${un.length} unmapped`); process.exit(1); }
if (l.mapped !== l.total_rows) { console.error('FAIL: counts disagree'); process.exit(1); }
console.log(`OK: ${l.total_rows} headings mapped, 0 orphans`);
