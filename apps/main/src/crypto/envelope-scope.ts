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
