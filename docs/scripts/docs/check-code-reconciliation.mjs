// Gate: docs<->code reconciliation ledger is well-formed and internally consistent.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const d = JSON.parse(readFileSync('status/code-reconciliation.json', 'utf8'));
const allow = new Set(d.verdicts);
let bad = 0;
const tally = {};
for (const f of d.facts) {
  for (const k of ['id', 'area', 'doc_claim', 'code_truth', 'code_ref', 'verdict']) {
    if (!f[k]) { console.error(`FAIL: ${f.id ?? '?'} missing ${k}`); bad++; }
  }
  if (!allow.has(f.verdict)) { console.error(`FAIL: ${f.id} bad verdict ${f.verdict}`); bad++; }
  tally[f.verdict] = (tally[f.verdict] ?? 0) + 1;
}
for (const [k, v] of Object.entries(d.counts)) {
  if (k === 'total') { if (v !== d.facts.length) { console.error(`FAIL: total ${v} != ${d.facts.length}`); bad++; } }
  else if ((tally[k] ?? 0) !== v) { console.error(`FAIL: count ${k} ${v} != ${tally[k] ?? 0}`); bad++; }
}
if (bad) process.exit(1);

// Freshness (UR-20261011-012 R4): when a git work tree is present, the recorded verified_commit
// should resolve as a commit here and be an ancestor of HEAD. A ledger merely *behind* HEAD is
// warned, not failed; and a commit that is simply ABSENT — the default `actions/checkout` is a
// shallow (fetch-depth: 1) clone — is warned, not failed, because freshness is not verifiable in a
// shallow checkout. Only a commit that resolves but is NOT an ancestor of HEAD is a hard defect.
try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  if (d.verified_commit) {
    let resolves = true;
    try {
      execSync(`git cat-file -e ${d.verified_commit}^{commit}`, { stdio: 'ignore' });
    } catch {
      resolves = false;
    }
    if (!resolves) {
      console.warn(`WARN: verified_commit ${d.verified_commit.slice(0, 7)} is not present in this checkout (shallow?) — freshness not verifiable here`);
    } else {
      try {
        execSync(`git merge-base --is-ancestor ${d.verified_commit} HEAD`, { stdio: 'ignore' });
      } catch {
        console.error(`FAIL: verified_commit ${d.verified_commit} is not an ancestor of HEAD`);
        process.exit(1);
      }
      const head = execSync('git rev-parse HEAD', { stdio: 'ignore' }).toString().trim();
      // Freshness (UR-20261015-090 R2): the ledger verifies DOCS against CODE. It goes stale only
      // when the CODE moves — a docs-only commit does not invalidate a code-grounding claim. So fail
      // when any commit since verified_commit touched the code surfaces (apps/main, packages).
      // Pathspecs use the :/ root prefix so this works from the docs/ working directory.
      const codeDrift = execSync(
        `git rev-list ${d.verified_commit}..HEAD -- :/apps/main :/packages 2>/dev/null || true`,
        { stdio: ['ignore', 'pipe', 'ignore'] },
      )
        .toString()
        .trim();
      if (codeDrift) {
        const n = codeDrift.split('\n').filter(Boolean).length;
        console.error(
          `FAIL: ${n} commit(s) touched apps/main|packages since verified_commit ${d.verified_commit.slice(0, 7)} (HEAD ${head.slice(0, 7)}) — re-verify the ledger and re-anchor`,
        );
        process.exit(1);
      }
      if (head !== d.verified_commit) {
        console.log(
          `OK: reconciliation verified at ${d.verified_commit.slice(0, 7)}; HEAD ${head.slice(0, 7)} — no code change since (docs-only commits do not invalidate)`,
        );
      }
    }
  }
} catch {
  /* no git work tree (e.g. a bare export) — freshness is not checkable here */
}

console.log(`OK: code-reconciliation (${d.facts.length} facts, counts consistent)`);
