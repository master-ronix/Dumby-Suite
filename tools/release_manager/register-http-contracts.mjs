#!/usr/bin/env node
/**
 * Appendix C #11 — register the REST/MDIS HTTP contract families into the Compatibility Ledger at
 * release time. The shipped ledger artifact is intentionally empty-but-enforced (the release gate
 * refuses any deployment whose contracts are not registered); this script is the release step that
 * registers the HTTP families the application publishes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ledgerPath = join(here, 'compatibility-ledger.json');

const HTTP_FAMILIES = [
  { name: 'http-admin', kind: 'http', source: 'docs/contracts/openapi.yaml#/paths/~1admin' },
  { name: 'http-health', kind: 'http', source: 'docs/contracts/openapi.yaml#/paths/~1health' },
  { name: 'http-metrics', kind: 'http', source: 'docs/contracts/openapi.yaml#/paths/~1metrics' },
  { name: 'http-info', kind: 'http', source: 'docs/contracts/openapi.yaml#/paths/~1paths~1api~1info' },
  { name: 'http-oauth', kind: 'http', source: 'docs/contracts/openapi.yaml#/paths/~1oauth' },
];

const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const existing = new Set((ledger.contracts ?? []).map((c) => c.name));
for (const family of HTTP_FAMILIES) {
  if (!existing.has(family.name)) ledger.contracts.push(family);
}
writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(`register-http-contracts: ledger now carries ${ledger.contracts.length} contract(s)`);
