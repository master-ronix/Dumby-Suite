// Gate: every path the manifest declares must exist. Covers documents, contracts,
// archive entries, assets, AND generated files — the last of which previously slipped
// through (a dangling `status/compliance.json` passed for months).
import { readFileSync, existsSync } from 'node:fs';
const m = JSON.parse(readFileSync('manifest.json', 'utf8'));
let bad = 0;
for (const d of m.documents) if (!existsSync(d.path)) { console.error(`FAIL: document path missing: ${d.path}`); bad++; }
for (const c of m.contracts) if (!existsSync(c)) { console.error(`FAIL: contract missing: ${c}`); bad++; }
for (const a of (m.archive || [])) if (!existsSync(a.path)) { console.error(`FAIL: archive path missing: ${a.path}`); bad++; }
for (const [k, p] of Object.entries(m.assets || {})) if (!existsSync(p)) { console.error(`FAIL: asset "${k}" missing: ${p}`); bad++; }
for (const g of (m.generated || [])) if (!existsSync(g)) { console.error(`FAIL: generated path missing: ${g}`); bad++; }
if (bad) process.exit(1);
console.log('OK: manifest resolves (documents, contracts, archive, assets, generated)');
