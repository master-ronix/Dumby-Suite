/**
 * §22.8: a missing credential, an unknown keyId, a mismatched secret and a pending identity all
 * return the identical 401 — status, headers and body byte-for-byte, from every entry point.
 * These constants are the single definition of that response; entry points must not build their
 * own. The precise cause is written to the operator log instead, never to the caller.
 */
export const CREDENTIAL_REFUSAL_STATUS = 401;

/** Frozen so both the Credentials Service and Swastik serialise the same bytes. */
export const CREDENTIAL_REFUSAL_BODY: Readonly<Record<string, never>> = Object.freeze({});

export interface CredentialRefusalLogFields {
  /** Which surface refused — for operator logs only. */
  readonly service: 'credentials' | 'swastik';
  /** The precise cause from `CredentialVerificationError.reason`, or a route-level reason. */
  readonly reason: string;
  /** Non-secret correlation handle. Never the secret, never its hash. */
  readonly keyId?: string;
}
