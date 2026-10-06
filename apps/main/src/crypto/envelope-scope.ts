export const CREDENTIAL_TREATMENTS = {
  hash: 'hash',
  seal: 'seal',
} as const;

export type CredentialTreatment =
  (typeof CREDENTIAL_TREATMENTS)[keyof typeof CREDENTIAL_TREATMENTS];

export type CredentialPurpose =
  { readonly purpose: 'verify-only' } | { readonly purpose: 'in-process-readable' };

export class BoundaryViolationError extends Error {
  override readonly name = 'BoundaryViolationError';
}

export function resolveCredentialTreatment(
  descriptor: CredentialPurpose,
  requested?: CredentialTreatment,
): CredentialTreatment {
  let resolved: CredentialTreatment;
  if (descriptor.purpose === 'verify-only') {
    resolved = CREDENTIAL_TREATMENTS.hash;
  } else if (descriptor.purpose === 'in-process-readable') {
    resolved = CREDENTIAL_TREATMENTS.seal;
  } else {
    throw new BoundaryViolationError(
      'unknown credential purpose — no at-rest scheme applies; rejecting loudly',
    );
  }

  if (requested !== undefined && requested !== resolved) {
    throw new BoundaryViolationError(
      `impersonated credential treatment: purpose "${descriptor.purpose}" requires '${resolved}', ` +
        `but '${requested}' was requested — the boundary never yields (ADR-003 invariant)`,
    );
  }
  return resolved;
}

export function assertStorageTreatment(
  descriptor: CredentialPurpose,
  storedWith: CredentialTreatment,
): void {
  const resolved = resolveCredentialTreatment(descriptor);
  if (storedWith !== resolved) {
    throw new BoundaryViolationError(
      `at-rest treatment mismatch for "${descriptor.purpose}": stored value is '${storedWith}' ` +
        `but the invariant requires '${resolved}'`,
    );
  }
}

/**
 * E6 GOV-13 — the scope-boundary verification ADR-003 asks for. The at-rest credential stores and
 * the treatment each must carry, so the boundary can be checked rather than assumed.
 */
export interface CredentialStoreInventoryEntry {
  readonly name: string;
  readonly purpose: CredentialPurpose;
  readonly storedWith: CredentialTreatment;
}

export const CREDENTIAL_STORE_INVENTORY: readonly CredentialStoreInventoryEntry[] = Object.freeze([
  {
    name: 'credentials.credentialHash',
    purpose: { purpose: 'verify-only' },
    storedWith: CREDENTIAL_TREATMENTS.hash,
  },
  {
    name: 'credentials.devIdHash',
    purpose: { purpose: 'verify-only' },
    storedWith: CREDENTIAL_TREATMENTS.hash,
  },
  {
    name: 'sealed_credentials.sealedValue',
    purpose: { purpose: 'in-process-readable' },
    storedWith: CREDENTIAL_TREATMENTS.seal,
  },
  {
    name: 'persona_identities.botTokenSealed',
    purpose: { purpose: 'in-process-readable' },
    storedWith: CREDENTIAL_TREATMENTS.seal,
  },
]);

/**
 * Verifies the inventory against the ADR-003 boundary and returns one message per violation
 * (empty means the boundary holds). A value the system never reads back may not be sealed, and a
 * value the system must use may not be hashed.
 */
export function verifyEnvelopeScope(
  inventory: readonly CredentialStoreInventoryEntry[],
): readonly string[] {
  const violations: string[] = [];
  for (const entry of inventory) {
    try {
      assertStorageTreatment(entry.purpose, entry.storedWith);
    } catch (err) {
      if (err instanceof BoundaryViolationError) violations.push(`${entry.name}: ${err.message}`);
      else throw err;
    }
  }
  return violations;
}
