// Gate: document ids are unique AND no frontmatter `anchors` list repeats an entry.
// (Duplicate anchors were previously uncaught — the audit register listed one anchor
// eight times.)
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const files = execSync("find spec blueprint documentation -name '*.md' 2>/dev/null || true").toString().trim().split('\n').filter(Boolean);
const ids = new Set(); let bad = 0;
for (const f of files) {
  const t = readFileSync(f, 'utf8');
  const m = t.match(/^id:\s*(.+)$/m);
  if (m) { if (ids.has(m[1])) { console.error('FAIL: dup id ' + m[1]); bad++; } ids.add(m[1]); }
  const a = t.match(/^anchors:\s*\[([^\]]*)\]/m);
  if (a) {
    const items = a[1].split(',').map((s) => s.trim()).filter(Boolean);
    const seen = new Set();
    const dup = items.filter((x) => (seen.has(x) ? true : (seen.add(x), false)));
    if (dup.length) { console.error(`FAIL: dup anchor(s) in ${f}: ${[...new Set(dup)].join(', ')}`); bad++; }
  }
}
if (bad) process.exit(1);
console.log(`OK: ${ids.size} unique ids; no duplicate anchors`);
