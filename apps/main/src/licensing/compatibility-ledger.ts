/**
 * The Compatibility Ledger (blueprint §14.4, directive D-8.10) — the
 * machine-readable registry of every cross-boundary contract version window,
 * and the release gate for both directions of release.
 *
 * Contract model: each contract has a **current version** (the version the
 * running core ships) and acceptance **windows** held by counterparts (a
 * module or an API family) over that contract. A window is
 * `[minInclusive, maxExclusive)` with an excluded list.
 *
 * The ledger is enforced, not descriptive:
 *  - A core release cannot ship until every window held by a currently-deployed
 *    module is satisfied by the proposed core contract versions.
 *  - A module deployment cannot be promoted until its declared windows are
 *    satisfied by the running core and by every co-deployed dependency.
 *  - Both checks fail closed: an unregistered contract is unsatisfied, never
 *    exempt. The ledger stands from Phase 0 empty but enforced.
 *
 * The §45 compliance matrix is generated from this ledger, never hand-written.
 */

import { parseSemver, versionWithinWindow } from './semver.js';
import type { ContractWindow } from './semver.js';

export type { ContractWindow } from './semver.js';

export const LEDGER_FORMAT_VERSION = 1 as const;

export interface LedgerContractRecord {
  readonly contractId: string;
  /** The contract version shipped by the running core. */
  readonly currentVersion: string;
}

export interface LedgerWindowEntry {
  /** The party holding this acceptance window (module slug or API family). */
  readonly counterpart: string;
  readonly contractId: string;
  readonly window: ContractWindow;
}

export interface LedgerProvidesRecord {
  /** The party providing/shipping this contract (a co-deployed module). */
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
  /** The proposed contract versions the new core ships. */
  readonly proposedContractVersions: Readonly<Record<string, string>>;
  /** Modules currently deployed fleet-wide (they hold acceptance windows). */
  readonly deployedModuleNames: readonly string[];
}

export interface ModuleDeploymentDeclaration {
  readonly moduleName: string;
  /** The windows the module declares over the contracts it touches. */
  readonly declaredWindows: ReadonlyArray<{
    readonly contractId: string;
    readonly window: ContractWindow;
  }>;
  /** Modules deployed alongside this one (co-deployed dependencies). */
  readonly coDeployedModuleNames: readonly string[];
}

/**
 * The Compatibility Ledger. Mutable for construction convenience, but all
 * read/gate operations are pure snapshots.
 */
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

  /** Removes a contract — unregistered contracts fail closed in every gate. */
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

  /** Snapshot of every window recorded in the ledger. */
  allWindows(): readonly LedgerWindowEntry[] {
    return [...this.#windows];
  }

  /** Snapshot of every registered contract record. */
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

/**
 * Core-release gate (§14.4, D-8.10): a core release cannot ship until every
 * window held by a currently-deployed module is satisfied by the proposed core
 * contract versions. Fail closed — an unregistered contract, or a held window
 * whose contract is absent from the proposal, is a violation.
 */
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

/**
 * Module-deployment gate (§14.4): a module deployment cannot be promoted until
 * its declared contract windows are satisfied by the running core AND by every
 * co-deployed dependency. Fail closed — an unregistered contract is a
 * violation, never an exemption.
 */
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

/**
 * §45 compliance matrix, generated from the ledger — one row per registered
 * contract, so it can never drift from the registry that actually gates
 * releases (D-8.10, blueprint §45).
 */
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
