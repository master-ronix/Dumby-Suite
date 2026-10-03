export interface AdminEvalGateResult {
  allowed: boolean;
  reason: 'enabled' | 'disabled' | 'production';
}

/**
 * §11 Layer 4 — the framework's independent environment guard for a deployment's most
 * consequential Admin-tier capability. The framework ships the gate, not the capability: a module
 * author building something as dangerous as arbitrary code evaluation sits it behind this, so
 * enabling the capability takes an explicit flag *and* a non-production environment. Disabling it
 * therefore takes a deployment change, not a bot command, and it stays inert in production
 * regardless of the state of Layers 1–3.
 */
export class AdminEvalGate {
  constructor(
    private readonly enabled: boolean,
    private readonly nodeEnv: string,
  ) {}

  check(): AdminEvalGateResult {
    if (this.nodeEnv === 'production') return { allowed: false, reason: 'production' };
    if (!this.enabled) return { allowed: false, reason: 'disabled' };
    return { allowed: true, reason: 'enabled' };
  }

  isAllowed(): boolean {
    return this.check().allowed;
  }
}
