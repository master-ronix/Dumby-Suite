import { describe, expect, test } from 'vitest';
import { AdminEvalGate } from '../../src/permissions/admin-eval-gate.js';
import { Container } from '../../src/di/container.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';

/**
 * §11 Layer 4 — `CORE_ADMIN_EVAL_ENABLED` was declared but read by no code. The framework ships
 * the gate for a deployment's most consequential Admin-tier capability, not the capability: the
 * capability is allowed only when the flag is set AND the environment is not production, so
 * disabling it takes a deployment change, not a bot command, and it stays inert in production
 * regardless of Layers 1–3.
 */
describe('M9 env keys — §11 Layer 4 admin-eval gate', () => {
  test('disabled in production even when the flag is set', () => {
    const gate = new AdminEvalGate(true, 'production');
    expect(gate.check()).toEqual({ allowed: false, reason: 'production' });
    expect(gate.isAllowed()).toBe(false);
  });

  test('disabled outside production when the flag is unset', () => {
    expect(new AdminEvalGate(false, 'staging').check()).toEqual({
      allowed: false,
      reason: 'disabled',
    });
  });

  test('allowed only when the flag is set and the environment is not production', () => {
    expect(new AdminEvalGate(true, 'development').check()).toEqual({
      allowed: true,
      reason: 'enabled',
    });
  });

  test('is resolvable from the container by its token', () => {
    const container = new Container();
    container.registerValue(CORE_TOKENS.AdminEvalGate, new AdminEvalGate(true, 'test'));
    expect(container.resolve(CORE_TOKENS.AdminEvalGate).isAllowed()).toBe(true);
  });
});
