import { randomBytes, randomUUID } from 'node:crypto';
import {
  open,
  rotate,
  seal,
  type EnvelopeRootKey,
  type SealedEnvelope,
} from '../crypto/envelope.js';
import { assertStorageTreatment, CREDENTIAL_TREATMENTS } from '../crypto/envelope-scope.js';
import type { SealedCredentialStore } from '../db/repositories/sealed-credential.repository.js';

export class SealedCredentialNotFoundError extends Error {
  override readonly name = 'SealedCredentialNotFoundError';
}

export class SealedCredentialRevokedError extends Error {
  override readonly name = 'SealedCredentialRevokedError';
}

export interface IssuedSealedCredential {
  readonly credentialId: string;
  readonly label: string;
  readonly registeredBy: string;
  /** The plaintext value. Returned exactly once at issuance; never persisted. */
  readonly value: string;
  readonly envelope: SealedEnvelope;
}

/**
 * Owns envelope-encrypted in-process-readable credentials (ADR-003).
 *
 * Every value routed through this service is, by construction of the issuing
 * route, one the system must read back to present — the boundary check is
 * explicit on every write (`assertStorageTreatment`), mirroring the invariant
 * that a credential in this class is NEVER stored under a one-way hash.
 */
export class SealedCredentialService {
  constructor(
    private readonly store: SealedCredentialStore,
    private readonly currentRootKey: EnvelopeRootKey,
  ) {}

  /** Issue a sealed credential; the plaintext leaves the process exactly once. */
  async issue(label: string, registeredBy: string, value: string): Promise<IssuedSealedCredential> {
    assertStorageTreatment({ purpose: 'in-process-readable' }, CREDENTIAL_TREATMENTS.seal);
    const credentialId = randomUUID().replaceAll('-', '').slice(0, 24);
    const envelope = seal(new TextEncoder().encode(value), this.currentRootKey);
    await this.store.insert({
      id: randomUUID(),
      credentialId,
      label,
      registeredBy,
      envelope,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { credentialId, label, registeredBy, value, envelope };
  }

  /** Read back a sealed credential as plaintext for presentation. */
  async read(credentialId: string): Promise<string> {
    const record = await this.store.findByCredentialId(credentialId);
    if (!record) throw new SealedCredentialNotFoundError(credentialId);
    if (record.revokedAt !== null) {
      throw new SealedCredentialRevokedError(credentialId);
    }
    const plain = open(record.envelope, this.currentRootKey);
    return new TextDecoder().decode(plain);
  }

  async revoke(credentialId: string): Promise<boolean> {
    return this.store.markRevoked(credentialId);
  }

  /**
   * Rotate the root key for every active sealed credential: each record's DEK
   * is re-wrapped under the new root key and re-id'd. Record ciphertexts are
   * never decrypted during rotation, so the plaintext credential values never
   * enter the clear here.
   */
  async rotateRootKey(nextRootKey: EnvelopeRootKey): Promise<number> {
    const active = await this.store.listActive();
    for (const record of active) {
      const rotated = rotate(record.envelope, this.currentRootKey, nextRootKey);
      await this.store.updateEnvelope(record.credentialId, rotated);
    }
    return active.length;
  }
}

export function generateCredentialValue(): string {
  return randomBytes(32).toString('hex');
}
