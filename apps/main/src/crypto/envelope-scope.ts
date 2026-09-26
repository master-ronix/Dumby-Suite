/**
 * ADR-003 scope boundary — envelope encryption vs Argon2id one-way hashing.
 *
 * Blueprint §32.7 and ADR-003 define exactly two at-rest schemes for
 * credential-shaped values and an invariant between them:
 *
 *   - verify-only secrets  → Argon2id one-way hashing ONLY (never reversible)
 *   - in-process-readable  → envelope encryption ONLY (root key → DEKs → AES-GCM)
 *
 * A value that the system only needs to verify must never be reversibly
 * encrypted; a value the system must present or read back must never be stored
 * under a one-way hash. This module is the single decision point that enforces
 * that invariant; callers route each stored value through
 * `resolveCredentialTreatment` rather than choosing a scheme ad hoc.
 *
 * The boundary is "exactly and only credentials whose verification requires
 * reading them back" (ADR-003). It must not widen without a superseding ADR.
 */

export const CREDENTIAL_TREATMENTS = {
  /** Validate-only secrets (passwords, developer tokens, authkeys): one-way hash. */
  hash: 'hash',
  /** Credentials the system must present or read back: envelope encryption. */
  seal: 'seal',
} as const;

export type CredentialTreatment =
  (typeof CREDENTIAL_TREATMENTS)[keyof typeof CREDENTIAL_TREATMENTS];

/** Justifications the boundary recognizes; any other purpose is rejected. */
export type CredentialPurpose =
  { readonly purpose: 'verify-only' } | { readonly purpose: 'in-process-readable' };

export class BoundaryViolationError extends Error {
  override readonly name = 'BoundaryViolationError';
}

/**
 * Fail-closed boundary decision. Every at-rest credential storage site routes
 * through here. Unknown purposes and mismatched schemes are errors, never
 * silent fallbacks — a "safe-looking" default is exactly how the two schemes
 * get misapplied (ADR-003 context).
 */
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

/**
 * Inverse check for storage sites that persist a value: given the purpose and
 * the directory/schema marker actually used, the stored marker must match the
 * resolved treatment. Keeps migrations and repositories honest about which
 * column carries which scheme.
 */
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
