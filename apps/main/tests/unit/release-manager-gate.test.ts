import { test, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  CompatibilityLedger,
  checkCoreRelease,
  checkModuleDeployment,
  deserializeLedger,
  generateComplianceMatrix,
  serializeLedger,
} from '../../src/licensing/compatibility-ledger.js';

const TOOLS_LEDGER_PATH = fileURLToPath(
  new URL('../../../../tools/release_manager/compatibility-ledger.json', import.meta.url),
);

test('the machine-readable ledger artifact ships, is valid, and is empty-but-enforced', () => {
  expect(existsSync(TOOLS_LEDGER_PATH)).toBe(true);
  const ledger = deserializeLedger(readFileSync(TOOLS_LEDGER_PATH, 'utf8'));
  expect(ledger).toBeInstanceOf(CompatibilityLedger);
  const refused = checkModuleDeployment(ledger, {
    moduleName: 'moderation',
    declaredWindows: [
      {
        contractId: 'manifest-schema',
        window: { minInclusive: '1.0.0', maxExclusive: '2.0.0', excluded: [] },
      },
    ],
    coDeployedModuleNames: [],
  });
  expect(refused.allowed).toBe(false);
  expect(refused.violations[0]).toContain('not registered');
  const reparsed = deserializeLedger(serializeLedger(ledger));
  expect(reparsed.allContracts()).toEqual([]);
});

test('release-time core gate refuses a core release whose proposed versions violate held windows', () => {
  const ledger = CompatibilityLedger.empty()
    .registerContract('manifest-schema', '1.0.0')
    .recordWindow('moderation', 'manifest-schema', {
      minInclusive: '1.0.0',
      maxExclusive: '2.0.0',
      excluded: [],
    });
  const ok = checkCoreRelease(ledger, {
    proposedContractVersions: { 'manifest-schema': '1.9.0' },
    deployedModuleNames: ['moderation'],
  });
  expect(ok.allowed).toBe(true);

  const bad = checkCoreRelease(ledger, {
    proposedContractVersions: { 'manifest-schema': '2.0.0' },
    deployedModuleNames: ['moderation'],
  });
  expect(bad.allowed).toBe(false);
  expect(bad.violations[0]).toContain('falls outside deployed module');
});

test('promotion-time gate refuses a deployment that violates the running core', () => {
  const ledger = CompatibilityLedger.empty()
    .registerContract('manifest-schema', '1.0.0')
    .recordWindow('moderation', 'manifest-schema', {
      minInclusive: '1.0.0',
      maxExclusive: '2.0.0',
      excluded: [],
    });
  const outcome = checkModuleDeployment(ledger, {
    moduleName: 'moderation',
    declaredWindows: [
      {
        contractId: 'manifest-schema',
        window: { minInclusive: '2.0.0', maxExclusive: '3.0.0', excluded: [] },
      },
    ],
    coDeployedModuleNames: [],
  });
  expect(outcome.allowed).toBe(false);
  expect(outcome.violations[0]).toContain('falls outside module "moderation"\'s window');
});

test('the compliance matrix derives from registrations and stays drift-free', () => {
  const ledger = CompatibilityLedger.empty().registerContract('manifest-schema', '1.0.0');
  const matrix = generateComplianceMatrix(ledger);
  expect(matrix).toEqual([
    { capability: 'contract:manifest-schema', specifiedAt: '§14.4 ledger (manifest-schema@1.0.0)' },
  ]);
  expect(matrix).toHaveLength(ledger.allContracts().length);
});
