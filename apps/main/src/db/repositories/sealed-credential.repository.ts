import type { Knex } from 'knex';
import type { SealedEnvelope } from '../../crypto/envelope.js';

export interface SealedCredentialRecord {
  readonly id: string;
  readonly credentialId: string;
  readonly label: string;
  readonly registeredBy: string;
  readonly envelope: SealedEnvelope;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SealedCredentialStore {
  insert(record: SealedCredentialRecord): Promise<void>;
  findByCredentialId(credentialId: string): Promise<SealedCredentialRecord | undefined>;
  listByRegisteredBy(registeredBy: string): Promise<SealedCredentialRecord[]>;
  markRevoked(credentialId: string): Promise<boolean>;
  listActive(): Promise<SealedCredentialRecord[]>;
  updateEnvelope(credentialId: string, envelope: SealedEnvelope): Promise<boolean>;
}

interface SealedCredentialRow {
  id: string;
  credentialId: string;
  label: string;
  registeredBy: string;
  sealedValue: string;
  wrappedKey: string;
  sealIv: string;
  sealTag: string;
  wrapIv: string;
  wrapTag: string;
  sealAlgorithm: string;
  sealRootKeyId: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toRow(record: SealedCredentialRecord): SealedCredentialRow {
  return {
    id: record.id,
    credentialId: record.credentialId,
    label: record.label,
    registeredBy: record.registeredBy,
    sealedValue: record.envelope.ciphertext,
    wrappedKey: record.envelope.wrappedKey,
    sealIv: record.envelope.iv,
    sealTag: record.envelope.tag,
    wrapIv: record.envelope.wrapIv,
    wrapTag: record.envelope.wrapTag,
    sealAlgorithm: record.envelope.algorithm,
    sealRootKeyId: record.envelope.kid,
    revokedAt: record.revokedAt ? record.revokedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function fromRow(row: SealedCredentialRow): SealedCredentialRecord {
  return {
    id: row.id,
    credentialId: row.credentialId,
    label: row.label,
    registeredBy: row.registeredBy,
    envelope: {
      ciphertext: row.sealedValue,
      iv: row.sealIv,
      tag: row.sealTag,
      wrappedKey: row.wrappedKey,
      wrapIv: row.wrapIv,
      wrapTag: row.wrapTag,
      kid: row.sealRootKeyId,
      algorithm: row.sealAlgorithm as SealedEnvelope['algorithm'],
    },
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export class PostgresSealedCredentialStore implements SealedCredentialStore {
  constructor(private readonly knex: Knex) {}

  async insert(record: SealedCredentialRecord): Promise<void> {
    await this.knex('sealed_credentials').insert(toRow(record));
  }

  async findByCredentialId(credentialId: string): Promise<SealedCredentialRecord | undefined> {
    const row = await this.knex('sealed_credentials').where({ credentialId }).first();
    return row ? fromRow(row as SealedCredentialRow) : undefined;
  }

  async listByRegisteredBy(registeredBy: string): Promise<SealedCredentialRecord[]> {
    const rows = await this.knex('sealed_credentials')
      .where({ registeredBy })
      .orderBy('createdAt', 'desc');
    return (rows as SealedCredentialRow[]).map(fromRow);
  }

  async markRevoked(credentialId: string): Promise<boolean> {
    const updated = await this.knex('sealed_credentials')
      .where({ credentialId })
      .update({ revokedAt: new Date(), updatedAt: new Date() });
    return updated > 0;
  }

  async listActive(): Promise<SealedCredentialRecord[]> {
    const rows = await this.knex('sealed_credentials')
      .whereNull('revokedAt')
      .orderBy('createdAt', 'asc');
    return (rows as SealedCredentialRow[]).map(fromRow);
  }

  async updateEnvelope(credentialId: string, envelope: SealedEnvelope): Promise<boolean> {
    const updated = await this.knex('sealed_credentials').where({ credentialId }).update({
      sealedValue: envelope.ciphertext,
      wrappedKey: envelope.wrappedKey,
      sealIv: envelope.iv,
      sealTag: envelope.tag,
      wrapIv: envelope.wrapIv,
      wrapTag: envelope.wrapTag,
      sealAlgorithm: envelope.algorithm,
      sealRootKeyId: envelope.kid,
      updatedAt: new Date(),
    });
    return updated > 0;
  }
}

export class InMemorySealedCredentialStore implements SealedCredentialStore {
  private readonly rows = new Map<string, SealedCredentialRecord>();

  async insert(record: SealedCredentialRecord): Promise<void> {
    this.rows.set(record.credentialId, record);
  }

  async findByCredentialId(credentialId: string): Promise<SealedCredentialRecord | undefined> {
    return this.rows.get(credentialId);
  }

  async listByRegisteredBy(registeredBy: string): Promise<SealedCredentialRecord[]> {
    return [...this.rows.values()]
      .filter((record) => record.registeredBy === registeredBy)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markRevoked(credentialId: string): Promise<boolean> {
    const record = this.rows.get(credentialId);
    if (!record) return false;
    this.rows.set(credentialId, { ...record, revokedAt: new Date() });
    return true;
  }

  async listActive(): Promise<SealedCredentialRecord[]> {
    return [...this.rows.values()]
      .filter((record) => record.revokedAt === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateEnvelope(credentialId: string, envelope: SealedEnvelope): Promise<boolean> {
    const record = this.rows.get(credentialId);
    if (!record) return false;
    this.rows.set(credentialId, { ...record, envelope, updatedAt: new Date() });
    return true;
  }
}
