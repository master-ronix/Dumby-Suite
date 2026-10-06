import { existsSync, readdirSync } from 'node:fs';
import type { ModuleRegistry } from '../module-system/registry.js';

/**
 * Appendix C #18 — the operational tooling surface: the runbook index and a live operational
 * status summary, exposed to operators over HTTP and the admin CLI.
 */
export interface OperationalStatus {
  readonly modulesLoaded: number;
  readonly runbooks: string[];
}

export class OperationalService {
  constructor(
    private readonly registry: ModuleRegistry,
    private readonly runbooksDir: string,
  ) {}

  runbooks(): string[] {
    if (!existsSync(this.runbooksDir)) return [];
    return readdirSync(this.runbooksDir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .sort();
  }

  status(): OperationalStatus {
    return { modulesLoaded: this.registry.count(), runbooks: this.runbooks() };
  }
}
