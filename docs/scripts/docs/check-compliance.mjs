// Gate: status/compliance.json exists and is exactly what the generator derives —
// so the ledger cannot silently drift from contracts/ or status/capabilities.json.
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (!existsSync('status/compliance.json')) {
  console.error('FAIL: status/compliance.json missing (referenced by SPEC-08-REFERENCE edges)');
  process.exit(1);
}

// Re-derive into a temp file and compare (idempotence check).
const before = readFileSync('status/compliance.json', 'utf8');
execSync('node scripts/docs/gen-compliance.mjs', { stdio: 'ignore' });
const after = readFileSync('status/compliance.json', 'utf8');
if (before !== after) {
  console.error('FAIL: status/compliance.json is stale — regenerate with scripts/docs/gen-compliance.mjs');
  process.exit(1);
}

const d = JSON.parse(after);
const contractsOnDisk = readdirSync('contracts').filter((f) => f.endsWith('.json') || f.endsWith('.yaml')).length;
if (d.contract_count !== contractsOnDisk) {
  console.error(`FAIL: compliance.contract_count=${d.contract_count} but contracts/ has ${contractsOnDisk}`);
  process.exit(1);
}
const caps = JSON.parse(readFileSync('status/capabilities.json', 'utf8')).capabilities.length;
if (d.capability_count !== caps) {
  console.error(`FAIL: compliance.capability_count=${d.capability_count} but capabilities.json has ${caps}`);
  process.exit(1);
}
console.log(`OK: compliance (${d.contract_count} contracts, ${d.capability_count} capabilities, derived & current)`);
