import { parseSemver, versionWithinWindow } from './semver.js';
import type { ContractWindow } from './semver.js';

export type { ContractWindow } from './semver.js';

export const LEDGER_FORMAT_VERSION = 1 as const;

export interface LedgerContractRecord {
  readonly contractId: string;
  readonly currentVersion: string;
}

export interface LedgerWindowEntry {
  readonly counterpart: string;
  readonly contractId: string;
  readonly window: ContractWindow;
}

export interface LedgerProvidesRecord {
  readonly counterpart: string;
  readonly contractId: string;
  readonly version: string;
}

export interface CompatibilityLedgerData {
  readonly formatVersion: typeof LEDGER_FORMAT_VERSION;
  readonly contracts: readonly LedgerContractRecord[];
  readonly windows: readonly LedgerWindowEntry[];
  readonly provides: readonly LedgerProvidesRecord[];
}

export class ContractNotRegisteredError extends Error {
  constructor(readonly contractId: string) {
    super(`Contract "${contractId}" is not registered in the Compatibility Ledger (fail closed)`);
    this.name = 'ContractNotRegisteredError';
  }
}

export class DuplicateContractError extends Error {
  constructor(readonly contractId: string) {
    super(`Contract "${contractId}" is already registered in the Compatibility Ledger`);
    this.name = 'DuplicateContractError';
  }
}

export interface GateOutcome {
  readonly allowed: boolean;
  readonly violations: readonly string[];
}

export interface CoreReleaseDeclaration {
  readonly proposedContractVersions: Readonly<Record<string, string>>;
  readonly deployedModuleNames: readonly string[];
}

export interface ModuleDeploymentDeclaration {
  readonly moduleName: string;
  readonly declaredWindows: ReadonlyArray<{
    readonly contractId: string;
    readonly window: ContractWindow;
  }>;
  readonly coDeployedModuleNames: readonly string[];
}

export class CompatibilityLedger {
  readonly #contracts = new Map<string, string>();
  readonly #windows: LedgerWindowEntry[] = [];
  readonly #provides: LedgerProvidesRecord[] = [];

  private constructor() {}

  static empty(): CompatibilityLedger {
    return new CompatibilityLedger();
  }

  static fromJSON(data: CompatibilityLedgerData): CompatibilityLedger {
    const ledger = new CompatibilityLedger();
    for (const contract of data.contracts) {
      ledger.#contracts.set(contract.contractId, contract.currentVersion);
    }
    ledger.#windows.push(...data.windows);
    ledger.#provides.push(...data.provides);
    return ledger;
  }

  registerContract(contractId: string, currentVersion: string): CompatibilityLedger {
    if (this.#contracts.has(contractId)) {
      throw new DuplicateContractError(contractId);
    }
    this.#contracts.set(contractId, currentVersion);
    return this;
  }

  unregisterContract(contractId: string): CompatibilityLedger {
    this.#contracts.delete(contractId);
    return this;
  }

  recordWindow(
    counterpart: string,
    contractId: string,
    window: ContractWindow,
  ): CompatibilityLedger {
    this.#windows.push({ counterpart, contractId, window });
    return this;
  }

  recordProvides(counterpart: string, contractId: string, version: string): CompatibilityLedger {
    this.#provides.push({ counterpart, contractId, version });
    return this;
  }

  isRegistered(contractId: string): boolean {
    return this.#contracts.has(contractId);
  }

  contractVersion(contractId: string): string | undefined {
    return this.#contracts.get(contractId);
  }

  windowsHeldBy(counterpart: string): readonly LedgerWindowEntry[] {
    return this.#windows.filter((entry) => entry.counterpart === counterpart);
  }

  providedVersion(counterpart: string, contractId: string): string | undefined {
    const match = this.#provides.find(
      (record) => record.counterpart === counterpart && record.contractId === contractId,
    );
    return match?.version;
  }

  allWindows(): readonly LedgerWindowEntry[] {
    return [...this.#windows];
  }

  allContracts(): readonly LedgerContractRecord[] {
    return [...this.#contracts.entries()].map(
      ([contractId, currentVersion]): LedgerContractRecord => ({ contractId, currentVersion }),
    );
  }

  toJSON(): CompatibilityLedgerData {
    return {
      formatVersion: LEDGER_FORMAT_VERSION,
      contracts: [...this.#contracts.entries()].map(
        ([contractId, currentVersion]): LedgerContractRecord => ({ contractId, currentVersion }),
      ),
      windows: [...this.#windows],
      provides: [...this.#provides],
    };
  }
}

export function serializeLedger(ledger: CompatibilityLedger): string {
  return JSON.stringify(ledger.toJSON(), null, 2);
}

export function deserializeLedger(serialized: string): CompatibilityLedger {
  const parsed: unknown = JSON.parse(serialized);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('formatVersion' in parsed) ||
    (parsed as { formatVersion?: unknown }).formatVersion !== LEDGER_FORMAT_VERSION
  ) {
    throw new Error('Compatibility Ledger JSON has an unsupported format version');
  }
  const data = parsed as CompatibilityLedgerData;
  for (const contract of data.contracts) {
    if (parseSemver(contract.currentVersion) === null) {
      throw new Error(`Contract "${contract.contractId}" carries a malformed version`);
    }
  }
  return CompatibilityLedger.fromJSON(data);
}

export function checkCoreRelease(
  ledger: CompatibilityLedger,
  declaration: CoreReleaseDeclaration,
): GateOutcome {
  const violations: string[] = [];
  const deployed = new Set(declaration.deployedModuleNames);
  for (const windowEntry of ledger.allWindows()) {
    if (!deployed.has(windowEntry.counterpart)) continue;
    if (!ledger.isRegistered(windowEntry.contractId)) {
      violations.push(
        `contract "${windowEntry.contractId}" held by deployed module "${windowEntry.counterpart}" is not registered (fail closed)`,
      );
      continue;
    }
    const proposed = declaration.proposedContractVersions[windowEntry.contractId];
    if (proposed === undefined) {
      violations.push(
        `proposed core release does not carry contract "${windowEntry.contractId}" required by deployed module "${windowEntry.counterpart}"`,
      );
      continue;
    }
    if (!versionWithinWindow(proposed, windowEntry.window)) {
      violations.push(
        `contract "${windowEntry.contractId}" version "${proposed}" falls outside deployed module "${windowEntry.counterpart}"'s accepted window [${windowEntry.window.minInclusive}, ${windowEntry.window.maxExclusive})`,
      );
    }
  }
  return { allowed: violations.length === 0, violations };
}

export function checkModuleDeployment(
  ledger: CompatibilityLedger,
  declaration: ModuleDeploymentDeclaration,
): GateOutcome {
  const violations: string[] = [];
  for (const declared of declaration.declaredWindows) {
    if (!ledger.isRegistered(declared.contractId)) {
      violations.push(
        `contract "${declared.contractId}" is not registered in the Compatibility Ledger (fail closed)`,
      );
      continue;
    }
    const coreVersion = ledger.contractVersion(declared.contractId);
    if (coreVersion === undefined) {
      violations.push(
        `no running-core version is registered for contract "${declared.contractId}"`,
      );
      continue;
    }
    if (!versionWithinWindow(coreVersion, declared.window)) {
      violations.push(
        `running core contract "${declared.contractId}"@${coreVersion} falls outside module "${declaration.moduleName}"'s window [${declared.window.minInclusive}, ${declared.window.maxExclusive})`,
      );
    }
    for (const coDeployed of declaration.coDeployedModuleNames) {
      const provided = ledger.providedVersion(coDeployed, declared.contractId);
      if (provided === undefined) continue;
      if (!versionWithinWindow(provided, declared.window)) {
        violations.push(
          `co-deployed module "${coDeployed}" provides contract "${declared.contractId}"@${provided}, outside module "${declaration.moduleName}"'s window [${declared.window.minInclusive}, ${declared.window.maxExclusive})`,
        );
      }
    }
  }
  return { allowed: violations.length === 0, violations };
}

export function generateComplianceMatrix(
  ledger: CompatibilityLedger,
): ReadonlyArray<{ readonly capability: string; readonly specifiedAt: string }> {
  return [...ledger.allContracts()]
    .sort((a, b) => (a.contractId < b.contractId ? -1 : a.contractId > b.contractId ? 1 : 0))
    .map(({ contractId, currentVersion }) => ({
      capability: `contract:${contractId}`,
      specifiedAt: `§14.4 ledger (${contractId}@${currentVersion})`,
    }));
}
