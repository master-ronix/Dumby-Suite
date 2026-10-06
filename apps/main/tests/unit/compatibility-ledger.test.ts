import { test, expect } from 'vitest';
import {
  CompatibilityLedger,
  DuplicateContractError,
  checkCoreRelease,
  checkModuleDeployment,
  deserializeLedger,
  generateComplianceMatrix,
  serializeLedger,
} from '../../src/licensing/compatibility-ledger.js';
import { versionWithinWindow } from '../../src/licensing/semver.js';
import type { ContractWindow } from '../../src/licensing/semver.js';

const ANY = {
  minInclusive: '1.0.0',
  maxExclusive: '3.0.0',
  excluded: [],
} as const satisfies ContractWindow;

function ledgerWithModules(): CompatibilityLedger {
  return CompatibilityLedger.empty()
    .registerContract('manifest-schema', '1.0.0')
    .registerContract('rest:governance', '4.2.0')
    .recordWindow('moderation', 'manifest-schema', {
      minInclusive: '1.0.0',
      maxExclusive: '2.0.0',
      excluded: ['1.1.0'],
    })
    .recordWindow('moderation', 'rest:governance', {
      minInclusive: '4.0.0',
      maxExclusive: '5.0.0',
      excluded: [],
    })
    .recordProvides('logging-lib', 'rest:governance', '4.1.0');
}

test('contracts register, collide, and can be unregistered', () => {
  const ledger = CompatibilityLedger.empty().registerContract('manifest-schema', '1.0.0');
  expect(ledger.isRegistered('manifest-schema')).toBe(true);
  expect(ledger.contractVersion('manifest-schema')).toBe('1.0.0');
  expect(() => ledger.registerContract('manifest-schema', '2.0.0')).toThrow(DuplicateContractError);
  ledger.unregisterContract('manifest-schema');
  expect(ledger.isRegistered('manifest-schema')).toBe(false);
  expect(ledger.contractVersion('manifest-schema')).toBeUndefined();
});

test('window semantics: minimum inclusive, maximum exclusive, excluded list', () => {
  const window: ContractWindow = {
    minInclusive: '1.0.0',
    maxExclusive: '2.0.0',
    excluded: ['1.5.0'],
  };
  expect(versionWithinWindow('1.0.0', window)).toBe(true);
  expect(versionWithinWindow('1.9.9', window)).toBe(true);
  expect(versionWithinWindow('2.0.0', window)).toBe(false);
  expect(versionWithinWindow('0.9.9', window)).toBe(false);
  expect(versionWithinWindow('1.5.0', window)).toBe(false);
});

test('core-release gate: allowed when proposed versions satisfy every held window', () => {
  const ledger = ledgerWithModules();
  const outcome = checkCoreRelease(ledger, {
    proposedContractVersions: { 'manifest-schema': '1.2.0', 'rest:governance': '4.9.0' },
    deployedModuleNames: ['moderation'],
  });
  expect(outcome.allowed).toBe(true);
});

test('core-release gate: refused when a proposed version violates a held window', () => {
  const ledger = ledgerWithModules();
  const outcome = checkCoreRelease(ledger, {
    proposedContractVersions: { 'manifest-schema': '2.5.0', 'rest:governance': '4.9.0' },
    deployedModuleNames: ['moderation'],
  });
  expect(outcome.allowed).toBe(false);
  expect(outcome.violations.some((v) => v.includes('manifest-schema'))).toBe(true);
});

test('core-release gate: windows held by non-deployed modules are ignored', () => {
  const ledger = ledgerWithModules();
  const outcome = checkCoreRelease(ledger, {
    proposedContractVersions: { 'manifest-schema': '1.0.0' },
    deployedModuleNames: [],
  });
  expect(outcome.allowed).toBe(true);
});

test('fail closed: an unregistered contract is a violation, never exempt', () => {
  const unregistered = CompatibilityLedger.empty()
    .registerContract('manifest-schema', '1.0.0')
    .recordWindow('moderation', 'bogus-contract', ANY);
  const outcome = checkCoreRelease(unregistered, {
    proposedContractVersions: { 'bogus-contract': '1.0.0' },
    deployedModuleNames: ['moderation'],
  });
  expect(outcome.allowed).toBe(false);
  expect(outcome.violations[0]).toContain('not registered');
});

test('module-deployment gate: satisfied by running core and co-deployed deps', () => {
  const ledger = ledgerWithModules();
  const outcome = checkModuleDeployment(ledger, {
    moduleName: 'moderation',
    declaredWindows: [
      {
        contractId: 'manifest-schema',
        window: { minInclusive: '1.0.0', maxExclusive: '2.0.0', excluded: [] },
      },
    ],
    coDeployedModuleNames: ['logging-lib'],
  });
  expect(outcome.allowed).toBe(true);
});

test('module-deployment gate: refused when a co-deployed dependency violates', () => {
  const ledger = CompatibilityLedger.empty()
    .registerContract('rest:governance', '4.0.0')
    .recordWindow('moderation', 'rest:governance', {
      minInclusive: '4.0.0',
      maxExclusive: '4.5.0',
      excluded: [],
    })
    .recordProvides('logging-lib', 'rest:governance', '4.6.0');
  const outcome = checkModuleDeployment(ledger, {
    moduleName: 'moderation',
    declaredWindows: [
      {
        contractId: 'rest:governance',
        window: { minInclusive: '4.0.0', maxExclusive: '4.5.0', excluded: [] },
      },
    ],
    coDeployedModuleNames: ['logging-lib'],
  });
  expect(outcome.allowed).toBe(false);
});

test('module-deployment gate: refused when the running core version is outside', () => {
  const ledger = ledgerWithModules();
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
});

test('empty-but-enforced: empty ledger refuses any declared window, allows none', () => {
  const empty = CompatibilityLedger.empty();
  const refused = checkModuleDeployment(empty, {
    moduleName: 'mod',
    declaredWindows: [{ contractId: 'manifest-schema', window: ANY }],
    coDeployedModuleNames: [],
  });
  expect(refused.allowed).toBe(false);
  expect(refused.violations[0]).toContain('not registered');

  const tolerated = checkModuleDeployment(empty, {
    moduleName: 'mod',
    declaredWindows: [],
    coDeployedModuleNames: [],
  });
  expect(tolerated.allowed).toBe(true);
});

test('compliance matrix is generated from the ledger, never hand-written', () => {
  const ledger = CompatibilityLedger.empty()
    .registerContract('b-contract', '10.0.0')
    .registerContract('a-contract', '1.0.0');
  const rows = generateComplianceMatrix(ledger);
  expect(rows.map((r) => r.capability)).toEqual(['contract:a-contract', 'contract:b-contract']);
  expect(rows[0]?.specifiedAt).toContain('§14.4');
});

test('ledger serializes to machine-readable JSON and back, and rejects bad formats', () => {
  const ledger = ledgerWithModules();
  const json = serializeLedger(ledger);
  const parsed = JSON.parse(json) as {
    formatVersion: number;
    contracts: { contractId: string; currentVersion: string }[];
  };
  expect(parsed.formatVersion).toBe(1);
  const reloaded = deserializeLedger(json);
  expect(reloaded.contractVersion('manifest-schema')).toBe('1.0.0');
  expect(reloaded.windowsHeldBy('moderation')).toHaveLength(2);
  expect(() =>
    deserializeLedger('{"formatVersion":99,"contracts":[],"windows":[],"provides":[]}'),
  ).toThrow(/unsupported format version/);
  expect(() =>
    deserializeLedger(
      '{"formatVersion":1,"contracts":[{"contractId":"x","currentVersion":"not-semver"}],"windows":[],"provides":[]}',
    ),
  ).toThrow(/malformed version/);
});
