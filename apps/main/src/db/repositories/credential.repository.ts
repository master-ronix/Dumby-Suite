import type { Knex } from 'knex';

/**
 * §22.8 `credentials` table: one row per issued secret, keyed by `keyId`. The raw secret is
 * never persisted — only its Argon2id hash — and the developer identity is persisted only as
 * `devIdHash`.
 */
export interface CredentialRecord {
  readonly keyId: string;
  readonly purpose: CredentialPurpose;
  readonly credentialHash: string;
  readonly devIdHash: string | null;
  readonly status: CredentialStatus;
  readonly createdAt: Date;
  readonly revokedAt: Date | null;
}

export type CredentialPurpose =
  'devId' | 'buildId' | 'password' | 'service_to_service' | 'operator_keypair' | 'license_id';

export type CredentialStatus = 'pending' | 'active' | 'revoked';

export interface CredentialStore {
  insert(record: CredentialRecord): Promise<void>;
  findByKeyId(keyId: string): Promise<CredentialRecord | undefined>;
  markRevoked(keyId: string): Promise<boolean>;
  setStatus(keyId: string, status: CredentialStatus): Promise<boolean>;
}

interface CredentialRow {
  keyId: string;
  purpose: string;
  credentialHash: string;
  devIdHash: string | null;
  status: string;
  createdAt: string;
  revokedAt: string | null;
}

function fromRow(row: CredentialRow): CredentialRecord {
  return {
    keyId: row.keyId,
    purpose: row.purpose as CredentialPurpose,
    credentialHash: row.credentialHash,
    devIdHash: row.devIdHash,
    status: row.status as CredentialStatus,
    createdAt: new Date(row.createdAt),
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null,
  };
}

export class PostgresCredentialStore implements CredentialStore {
  constructor(private readonly knex: Knex) {}

  async insert(record: CredentialRecord): Promise<void> {
    await this.knex('credentials').insert({
      keyId: record.keyId,
      purpose: record.purpose,
      credentialHash: record.credentialHash,
      devIdHash: record.devIdHash,
      status: record.status,
      createdAt: record.createdAt,
      revokedAt: record.revokedAt,
    });
  }

  async findByKeyId(keyId: string): Promise<CredentialRecord | undefined> {
    const row = await this.knex('credentials').where({ keyId }).first();
    return row ? fromRow(row as CredentialRow) : undefined;
  }

  async markRevoked(keyId: string): Promise<boolean> {
    const updated = await this.knex('credentials').where({ keyId }).update({
      status: 'revoked',
      revokedAt: new Date(),
    });
    return updated > 0;
  }

  async setStatus(keyId: string, status: CredentialStatus): Promise<boolean> {
    const updated = await this.knex('credentials').where({ keyId }).update({ status });
    return updated > 0;
  }
}

export class InMemoryCredentialStore implements CredentialStore {
  private readonly rows = new Map<string, CredentialRecord>();

  async insert(record: CredentialRecord): Promise<void> {
    this.rows.set(record.keyId, record);
  }

  async findByKeyId(keyId: string): Promise<CredentialRecord | undefined> {
    return this.rows.get(keyId);
  }

  async markRevoked(keyId: string): Promise<boolean> {
    const record = this.rows.get(keyId);
    if (!record) return false;
    this.rows.set(keyId, { ...record, status: 'revoked', revokedAt: new Date() });
    return true;
  }

  async setStatus(keyId: string, status: CredentialStatus): Promise<boolean> {
    const record = this.rows.get(keyId);
    if (!record) return false;
    this.rows.set(keyId, { ...record, status });
    return true;
  }
}
