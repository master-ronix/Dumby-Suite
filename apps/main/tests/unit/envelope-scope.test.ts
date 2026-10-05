import { test, expect } from 'vitest';
import {
  resolveCredentialTreatment,
  assertStorageTreatment,
  verifyEnvelopeScope,
  CREDENTIAL_STORE_INVENTORY,
  CREDENTIAL_TREATMENTS,
  BoundaryViolationError,
} from '../../src/crypto/envelope-scope.js';

test('resolveCredentialTreatment maps purpose to its at-rest treatment', () => {
  expect(resolveCredentialTreatment({ purpose: 'verify-only' })).toBe('hash');
  expect(resolveCredentialTreatment({ purpose: 'in-process-readable' })).toBe('seal');
});

test('a conflicting requested treatment is a boundary violation', () => {
  expect(() => resolveCredentialTreatment({ purpose: 'verify-only' }, 'seal')).toThrow(
    BoundaryViolationError,
  );
  expect(resolveCredentialTreatment({ purpose: 'verify-only' }, 'hash')).toBe('hash');
});

test('an unknown purpose is rejected loudly', () => {
  expect(() => resolveCredentialTreatment({ purpose: 'nope' } as never)).toThrow(
    BoundaryViolationError,
  );
});

test('assertStorageTreatment enforces the ADR-003 invariant', () => {
  expect(() => assertStorageTreatment({ purpose: 'verify-only' }, 'hash')).not.toThrow();
  expect(() => assertStorageTreatment({ purpose: 'verify-only' }, 'seal')).toThrow(
    BoundaryViolationError,
  );
});

test('the shipped credential store inventory holds the boundary', () => {
  expect(verifyEnvelopeScope(CREDENTIAL_STORE_INVENTORY)).toStrictEqual([]);
});

test('a violating inventory yields one message per violation', () => {
  const violations = verifyEnvelopeScope([
    { name: 'a', purpose: { purpose: 'verify-only' }, storedWith: 'seal' },
    { name: 'b', purpose: { purpose: 'in-process-readable' }, storedWith: 'hash' },
  ] as never);
  expect(violations).toHaveLength(2);
  expect(violations[0]).toContain('a:');
  expect(violations[1]).toContain('b:');
});

test('the treatment constants are the two expected values', () => {
  expect(CREDENTIAL_TREATMENTS.hash).toBe('hash');
  expect(CREDENTIAL_TREATMENTS.seal).toBe('seal');
});
