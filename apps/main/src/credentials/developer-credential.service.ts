import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type {
  CredentialPurpose,
  CredentialRecord,
  CredentialStatus,
  CredentialStore,
} from '../db/repositories/credential.repository.js';

/**
 * The single refusal. Every verification failure — unknown keyId, mismatched secret, revoked
 * credential, pending identity, unbound developer — raises this one error with this one
 * message. It names no field, so it cannot become a failure oracle (§22.8).
 */
export class CredentialVerificationError extends Error {
  override readonly name = 'CredentialVerificationError';
  /** Set for operator-facing logs only; never sent to a caller. */
  readonly reason: string;

  constructor(reason: string) {
    super('invalid or missing credential');
    this.reason = reason;
  }
}

export interface IssuedCredential {
  readonly keyId: string;
  /** Returned exactly once, at issuance. Never persisted, never logged (TABLE 22-D). */
  readonly secret: string;
  readonly purpose: CredentialPurpose;
  readonly status: CredentialStatus;
}

export interface VerifiedCredential {
  readonly keyId: string;
  readonly purpose: CredentialPurpose;
  readonly status: CredentialStatus;
}

export interface IssueCredentialInput {
  readonly purpose: CredentialPurpose;
  /** Bound developer identity; persisted only as its Argon2id hash. */
  readonly devId?: string;
  readonly status?: CredentialStatus;
}

export type CredentialHasher = {
  hash(secret: string): Promise<string>;
  verify(hash: string, secret: string): Promise<boolean>;
};

const argon2Hasher: CredentialHasher = {
  hash: (secret) => argon2.hash(secret, { type: argon2.argon2id }),
  verify: (hash, secret) => argon2.verify(hash, secret),
};

export interface DeveloperCredentialServiceOptions {
  readonly hasher?: CredentialHasher;
  readonly keyIdBytes?: number;
  readonly secretBytes?: number;
}

/**
 * §22.8: the Credentials Service is the single, shared issuance path. Developer secrets are
 * stored only as Argon2id hashes keyed by `keyId`; verification hashes the presented secret and
 * compares it against the single row the keyId names, so it never scans or compares across
 * developers.
 */
export class DeveloperCredentialService {
  private readonly hasher: CredentialHasher;
  private readonly keyIdBytes: number;
  private readonly secretBytes: number;

  constructor(
    private readonly store: CredentialStore,
    options: DeveloperCredentialServiceOptions = {},
  ) {
    this.hasher = options.hasher ?? argon2Hasher;
    this.keyIdBytes = options.keyIdBytes ?? 16;
    this.secretBytes = options.secretBytes ?? 32;
  }

  async issue(input: IssueCredentialInput): Promise<IssuedCredential> {
    const keyId = `key_${randomBytes(this.keyIdBytes).toString('hex')}`;
    const secret = randomBytes(this.secretBytes).toString('hex');
    const credentialHash = await this.hasher.hash(secret);
    const devIdHash = input.devId === undefined ? null : await this.hasher.hash(input.devId);
    const status: CredentialStatus = input.status ?? 'pending';
    const record: CredentialRecord = {
      keyId,
      purpose: input.purpose,
      credentialHash,
      devIdHash,
      status,
      createdAt: new Date(),
      revokedAt: null,
    };
    await this.store.insert(record);
    return { keyId, secret, purpose: record.purpose, status };
  }

  /**
   * The caller presents the keyId together with the secret. `devId`, when supplied, must match
   * the identity the credential was issued against — that is what stops a `credentialKeyId`
   * substitution from re-pointing a live credential at another developer's row.
   *
   * Refusals are indistinguishable by construction: every rejection path throws the same error.
   */
  async verify(input: {
    keyId: string;
    secret: string;
    devId?: string;
  }): Promise<VerifiedCredential> {
    const record = await this.store.findByKeyId(input.keyId);
    if (record === undefined) throw new CredentialVerificationError('unknown-key-id');
    if (record.status === 'revoked' || record.revokedAt !== null) {
      throw new CredentialVerificationError('revoked-credential');
    }
    const secretMatches = await this.hasher.verify(record.credentialHash, input.secret);
    if (!secretMatches) throw new CredentialVerificationError('secret-mismatch');
    if (input.devId !== undefined) {
      if (record.devIdHash === null) {
        throw new CredentialVerificationError('credential-has-no-bound-identity');
      }
      const devIdMatches = await this.hasher.verify(record.devIdHash, input.devId);
      if (!devIdMatches) throw new CredentialVerificationError('identity-mismatch');
    }
    if (record.status !== 'active') throw new CredentialVerificationError('pending-credential');
    return { keyId: record.keyId, purpose: record.purpose, status: record.status };
  }

  async revoke(keyId: string): Promise<boolean> {
    return this.store.markRevoked(keyId);
  }

  async setStatus(keyId: string, status: CredentialStatus): Promise<boolean> {
    return this.store.setStatus(keyId, status);
  }
}
