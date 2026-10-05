// Gate: the trigger chain is well-formed and functional.
//   1. every chain document carries the shared skeleton (sections 1–8);
//   2. the handoff order is declared consistently (meta -> master|migration -> change-log);
//   3. every corpus cross-reference in a chain document resolves to a real path;
//   4. no stale reference (dead path, restructure artifact, legacy wording) remains.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIRS = ['prompts', 'orchestration', 'migration', 'upgradation'];
const chainFiles = DIRS.flatMap((d) =>
  readdirSync(d).filter((f) => f.endsWith('.md')).map((f) => join(d, f)));

const SKELETON = ['## 1. Identity', '## 2. Purpose', '## 3. Preconditions', '## 4. Inputs',
  '## 5. Ordered Steps', '## 6. Artefacts Produced', '## 7. Acceptance Criteria', '## 8. Change-Log Record'];

const ROLE = {
  'prompts/meta-prompt.md': { role: 'activate', to: ['orchestration/master-prompt.md', 'migration/migration-prompt.md'] },
  'orchestration/master-prompt.md': { role: 'build', to: ['upgradation/change-log.md'] },
  'migration/migration-prompt.md': { role: 'migrate', to: ['upgradation/change-log.md'] },
  'upgradation/change-log.md': { role: 'record', to: [] },
};

const CORPUS_PREFIX = /^(spec|blueprint|documentation|contracts|status|adr|upgradation|prompts|orchestration|migration|archive)\//;
const STALE = ['workspace/', 'structure-adapted', 'Adaptation for the restructured', 'nine-document', 'Blueprint §', 'Directive Part'];

let bad = 0;

// 1 + 2 + 4 on the four chain documents
for (const [file, spec] of Object.entries(ROLE)) {
  if (!existsSync(file)) { console.error(`FAIL: chain document missing: ${file}`); bad++; continue; }
  const t = readFileSync(file, 'utf8');
  for (const s of SKELETON) if (!t.includes(s)) { console.error(`FAIL: ${file} missing skeleton section "${s}"`); bad++; }
  const fm = t.split('---')[1] || '';
  if (!new RegExp(`chain_role:\\s*${spec.role}\\b`).test(fm)) { console.error(`FAIL: ${file} chain_role is not "${spec.role}"`); bad++; }
  for (const target of spec.to) if (!fm.includes(target)) { console.error(`FAIL: ${file} handoff_to omits ${target}`); bad++; }
}

// 3. cross-references resolve
for (const file of chainFiles) {
  const t = readFileSync(file, 'utf8');
  for (const m of t.matchAll(/`([a-z][a-z0-9_./-]*)`/g)) {
    let ref = m[1];
    if (!CORPUS_PREFIX.test(ref)) continue;      // only corpus paths are checked
    if (/[<>*…]/.test(ref)) continue;             // skip placeholders/globs
    const asFile = ref, asDir = ref.replace(/\/$/, '');
    if (!existsSync(asFile) && !existsSync(asDir)) {
      console.error(`FAIL: ${file} references a path that does not resolve: \`${ref}\``);
      bad++;
    }
  }
}

// 4. stale tokens across the four chain documents (the change-log's history is a legitimate
//    record and is excluded — only its chain-contract region is checked)
for (const file of Object.keys(ROLE)) {
  let t = readFileSync(file, 'utf8');
  const hist = t.indexOf('## 9. Record');
  if (hist !== -1) t = t.slice(0, hist);
  for (const s of STALE) if (t.includes(s)) { console.error(`FAIL: ${file} contains stale reference "${s}"`); bad++; }
}

if (bad) process.exit(1);
console.log(`OK: chain (4 documents; skeleton present; handoff order meta -> master|migration -> change-log; all cross-references resolve; no stale tokens)`);
