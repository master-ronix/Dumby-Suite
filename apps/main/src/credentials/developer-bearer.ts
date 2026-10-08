import type { CredentialVerifier } from './credential-client.js';
import { CredentialVerificationError } from './developer-credential.service.js';

export interface DeveloperCredentialPresentation {
  readonly keyId: string;
  readonly secret: string;
}

/**
 * Parses `Authorization: Bearer <keyId>.<secret>`. The devId is no longer a bearer token
 * (UR-B-05) — it is an opaque identifier that appears in response bodies and manifests only.
 * Returns undefined for anything that is not exactly one keyId and one secret, so a bare devId,
 * a devId with trailing junk, or a secret containing the separator is refused before any lookup.
 */
export function parseDeveloperCredential(
  authorization: string | undefined,
): DeveloperCredentialPresentation | undefined {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const presented = authorization.slice('Bearer '.length);
  const separator = presented.indexOf('.');
  if (separator <= 0 || separator === presented.length - 1) return undefined;
  const keyId = presented.slice(0, separator);
  const secret = presented.slice(separator + 1);
  if (secret.includes('.')) return undefined;
  return { keyId, secret };
}

export type DeveloperAuthFailureReason =
  'no-credential-presented' | 'credential-not-bound-to-a-developer' | 'credential-service-error';

export type DeveloperAuthOutcome =
  | {
      readonly ok: true;
      readonly devId: number;
      readonly keyId: string;
      readonly dev: Record<string, unknown>;
    }
  | {
      readonly ok: false;
      readonly reason: DeveloperAuthFailureReason | string;
      readonly keyId?: string;
    };

export type FindDeveloperByKeyId = (keyId: string) => Promise<Record<string, unknown> | undefined>;

/**
 * Authenticates a developer route. §22.8: a missing credential, an unknown keyId, a wrong
 * secret, a pending or revoked credential and a credential that no developer row points at all
 * are one indistinguishable 401 at the edge. This function returns the precise reason so the
 * caller can log and audit it, and hands the same single refusal body back to the client either
 * way.
 *
 * The resolved `devId` is passed into verification, so the credentials service re-checks it
 * against the `devIdHash` recorded at issuance. Repointing a live credential at a different
 * developer row therefore fails rather than authenticating.
 */
export async function authenticateDeveloperCredential(input: {
  authorization: string | undefined;
  verifier: CredentialVerifier;
  findDeveloperByKeyId: FindDeveloperByKeyId;
}): Promise<DeveloperAuthOutcome> {
  const presented = parseDeveloperCredential(input.authorization);
  if (!presented) return { ok: false, reason: 'no-credential-presented' };
  const dev = await input.findDeveloperByKeyId(presented.keyId);
  const devId = dev === undefined ? undefined : Number(dev['devId']);
  try {
    await input.verifier.verify(devId === undefined ? presented : { ...presented, devId });
  } catch (err) {
    const reason =
      err instanceof CredentialVerificationError ? err.reason : 'credential-service-error';
    return { ok: false, reason, keyId: presented.keyId };
  }
  if (dev === undefined || devId === undefined) {
    return { ok: false, reason: 'credential-not-bound-to-a-developer', keyId: presented.keyId };
  }
  return { ok: true, devId, keyId: presented.keyId, dev };
}
