#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import type { ContractWindow } from "../../apps/main/src/licensing/semver.js";
import {
  CompatibilityLedger,
  checkCoreRelease,
  checkModuleDeployment,
  deserializeLedger,
  type GateOutcome,
} from "../../apps/main/src/licensing/compatibility-ledger.js";

export function loadLedgerFile(path: string): CompatibilityLedger {
  return deserializeLedger(readFileSync(path, "utf8"));
}

export function runCoreGate(
  ledgerPath: string,
  proposed: Map<string, string>,
  deployed: string[],
): GateOutcome {
  const ledger = loadLedgerFile(ledgerPath);
  return checkCoreRelease(ledger, {
    proposedContractVersions: Object.fromEntries(proposed),
    deployedModuleNames: deployed,
  });
}

function parseWindows(
  specs: string[],
): Array<{ contractId: string; window: ContractWindow }> {
  return specs.map((spec) => {
    const [contractId, minInclusive, maxExclusive] = spec.split(":");
    if (!contractId || !minInclusive || !maxExclusive) {
      throw new Error(
        `malformed window "${spec}" — expected contractId:minInclusive:maxExclusive`,
      );
    }
    return { contractId, window: { minInclusive, maxExclusive, excluded: [] } };
  });
}

function main(): void {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      ledger: { type: "string" },
      proposed: { type: "string" },
      deployed: { type: "string" },
      module: { type: "string" },
      windows: { type: "string", multiple: true },
      coDeployed: { type: "string" },
    },
  });

  const gate = positionals[0];
  if (gate === "core") {
    const proposed = new Map<string, string>();
    for (const pair of (values.proposed ?? "").split(",").filter(Boolean)) {
      const eq = pair.indexOf("=");
      if (eq === -1)
        throw new Error(
          `malformed --proposed pair "${pair}" — expected contractId=version`,
        );
      proposed.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const outcome = runCoreGate(
      values.ledger!,
      proposed,
      (values.deployed ?? "").split(",").filter(Boolean),
    );
    report(outcome);
    return;
  }
  if (gate === "module") {
    const ledger = loadLedgerFile(values.ledger!);
    const outcome = checkModuleDeployment(ledger, {
      moduleName: values.module ?? "",
      declaredWindows: parseWindows(values.windows ?? []),
      coDeployedModuleNames: (values.coDeployed ?? "")
        .split(",")
        .filter(Boolean),
    });
    report(outcome);
    return;
  }
  throw new Error("usage: release-gate.ts core|module ...");
}

function report(outcome: GateOutcome): void {
  if (outcome.allowed) {
    process.stdout.write("ALLOWED — all ledger contract windows satisfied\n");
    process.exitCode = 0;
    return;
  }
  process.stderr.write(
    `REFUSED — Compatibility Ledger violations (${outcome.violations.length}):\n`,
  );
  for (const violation of outcome.violations) {
    process.stderr.write(`  - ${violation}\n`);
  }
  process.exitCode = 1;
}

if (import.meta.url === process.argv[1]) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`release-gate failed: ${String(err)}\n`);
    process.exit(1);
  }
}
