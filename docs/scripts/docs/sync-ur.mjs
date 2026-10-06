// Helper (NOT a gate): opt-in registration of UR headings into status/coverage-ledger.json.
//
// Default policy: UR records are provenance and are EXCLUDED from the static registries —
// check-ur.mjs validates them dynamically and nothing else needs to change when you add or
// edit a UR. Use this helper only when you DO want a UR's headings mapped in the ledger
// (e.g. for a UR that graduates into the traced corpus):
//
//     node scripts/docs/sync-ur.mjs           # register the headings of every detected UR
//     node scripts/docs/sync-ur.mjs --clear   # drop all UR rows (back to exclusion)
//
// The UR file is the source of truth; the ledger rows are derived from it, never hand-edited.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'upgradation';
const LEDGER = 'status/coverage-ledger.json';
const UR = /^UR-.*\.md$/i;
const clear = process.argv.includes('--clear');

const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const before = ledger.rows.length;

// always drop the derived UR rows first — they are regenerated (or left out, on --clear)
ledger.rows = ledger.rows.filter((r) => !(r.target || '').startsWith('upgradation/UR-'));

if (!clear) {
  const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => UR.test(f)).sort() : [];
  for (const f of files) {
    const lines = readFileSync(join(DIR, f), 'utf8').split('\n');
    lines.forEach((ln, i) => {
      const m = ln.match(/^#{1,4}\s+(.*)$/);
      if (!m) return;
      ledger.rows.push({
        source_file: f,
        source_line: i + 1,
        heading: m[1].trim(),
        target: `upgradation/${f}`,
        status: 'mapped',
      });
    });
  }
}

ledger.total_rows = ledger.rows.length;
ledger.mapped = ledger.rows.length;
const tgts = new Set(ledger.targets || []);
for (const r of ledger.rows) tgts.add(r.target);
ledger.targets = [...tgts].filter((t) => existsSync(t)).sort();

writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
console.log(`sync-ur: ${clear ? 'cleared UR rows' : 'registered UR headings'} · ledger ${before} → ${ledger.total_rows} rows`);
