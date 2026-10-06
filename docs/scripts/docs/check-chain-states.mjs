// Gate: the trigger chain's tri-state contract holds.
//
// The chain must expose THREE reachable states — Greenfield (build), Migration (delta),
// and Enforcement (code present, no delta) — and the migration protocol must refuse to
// run on an empty work order, handing to enforcement instead. This is what stops the
// chain dead-ending on an empty migration template when a real upgradation request is
// absent (the failure this contract was written to fix).
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const meta = read('prompts/meta-prompt.md');
const entry = read('prompts/entry.md');
const mig = read('migration/migration-prompt.md');
const master = read('orchestration/master-prompt.md');
const log = read('upgradation/change-log.md');

let bad = 0;
const need = (hay, needle, where) => {
  if (!hay.includes(needle)) { console.error(`FAIL: ${where} does not declare "${needle}"`); bad++; }
};

// 1. entry.md classifies three states.
for (const s of ['State A', 'State B', 'State C', 'Greenfield', 'Migration', 'Enforcement'])
  need(entry, s, 'prompts/entry.md');

// 1b. entry.md treats an exhausted (fully-DONE) work order as State C, not State B.
for (const s of ['INACTIVE', 'all `DONE`'])
  need(entry, s, 'prompts/entry.md');

// 2. meta-prompt routes three ways (build / migrate / enforce).
for (const s of ['State A', 'State B', 'State C', 'enforcement mode', 'all `DONE`'])
  need(meta, s, 'prompts/meta-prompt.md');

// 3. master-prompt exposes the enforcement (State C) entry and its pass.
for (const s of ['State C', 'Enforcement Pass'])
  need(master, s, 'orchestration/master-prompt.md');

// 4. migration-prompt guards against an empty work order and hands to enforcement.
for (const s of ['no active work order', 'State C', 'upgradation/UR-*.md'])
  need(mig, s, 'migration/migration-prompt.md');

// 5. the change-log records the enforcement line.
need(log, 'Enforcement line', 'upgradation/change-log.md');

if (bad) process.exit(1);
console.log('OK: chain-states (three reachable states — build / migration / enforcement; an empty work order hands to enforcement; the chain cannot dead-end)');
