import { describe, expect, test } from 'vitest';
import { resolveRegisteredDeveloper } from '../../src/module-system/developer-registry.js';

describe('developer-registry', () => {
  test('the first-party developer resolves to the framework display name, not the operator handle', () => {
    // UR-20261011-013 R11 — framework-shipped surfaces attribute to "Quixotic Mnemonics"
    // (SPEC-04-REQUEST-LAYER §1.5/§11.6). The operator handle `master_ronix` is NOT the developer
    // attribution, and the Info card (developer-identity.ts) and the identity band must agree.
    expect(resolveRegisteredDeveloper('dev_first_party')).toBe('Quixotic Mnemonics');
    expect(resolveRegisteredDeveloper('qm-dev-001')).toBe('Quixotic Mnemonics');
  });

  test('an unregistered or absent developer id resolves to undefined', () => {
    expect(resolveRegisteredDeveloper('unknown-dev')).toBeUndefined();
    expect(resolveRegisteredDeveloper(undefined)).toBeUndefined();
  });
});
