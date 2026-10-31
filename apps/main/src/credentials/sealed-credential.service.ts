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
  readonly value: string;
  readonly envelope: SealedEnvelope;
}

export class SealedCredentialService {
  constructor(
    private readonly store: SealedCredentialStore,
    private readonly currentRootKey: EnvelopeRootKey,
  ) {}

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
