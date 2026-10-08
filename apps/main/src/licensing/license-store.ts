import type { Knex } from 'knex';
import { transitionLicense, type LicenseRecord } from './license-machine.js';

const OPTIONAL_LICENSE_FIELDS = [
  'approvedBy',
  'approvedAt',
  'suspendedBy',
  'suspendedAt',
  'suspensionReason',
  'forceDisabled',
  'restoredBy',
  'restoredAt',
  'revokedBy',
  'revokedAt',
  'revocationReason',
  'verifiedFingerprint',
] as const satisfies ReadonlyArray<keyof LicenseRecord>;

export function licenseFromRow(row: Record<string, unknown>): LicenseRecord {
  const license: LicenseRecord = {
    licenseId: String(row['licenseId']),
    subjectDevId: Number(row['subjectDevId']),
    tierClass: row['tierClass'] as LicenseRecord['tierClass'],
    state: row['state'] as LicenseRecord['state'],
  };
  for (const key of OPTIONAL_LICENSE_FIELDS) {
    const value: unknown = row[key];
    if (typeof value === 'string' || typeof value === 'boolean') {
      (license as unknown as Record<string, string | boolean>)[key] = value;
    }
  }
  return license;
}

/**
 * Drives a developer license to `approved` along the only legal path (§15.7):
 * `pending → under-review → approved`. Returns the record unchanged when it is already `approved`
 * or when no legal path exists (e.g. `revoked`); the caller checks the result.
 */
export function approveLicenseRecord(
  license: LicenseRecord,
  actor: string,
  reason?: string,
): LicenseRecord {
  const input = reason === undefined ? { actor } : { actor, reason };
  let current = license;
  if (current.state === 'pending') current = transitionLicense(current, 'under-review', input);
  if (current.state === 'under-review') current = transitionLicense(current, 'approved', input);
  return current;
}

export interface LicenseStore {
  findBySubjectDevId(devId: number): Promise<LicenseRecord | undefined>;
  save(record: LicenseRecord): Promise<void>;
}

export class PostgresLicenseStore implements LicenseStore {
  constructor(private readonly knex: Knex) {}

  async findBySubjectDevId(devId: number): Promise<LicenseRecord | undefined> {
    const row = await this.knex('licenses')
      .where({ subjectDevId: devId })
      .first<Record<string, unknown> | undefined>();
    return row ? licenseFromRow(row) : undefined;
  }

  async save(record: LicenseRecord): Promise<void> {
    await this.knex('licenses')
      .where({ licenseId: record.licenseId })
      .update({
        state: record.state,
        approvedBy: record.approvedBy ?? null,
        approvedAt: record.approvedAt ?? null,
        suspendedBy: record.suspendedBy ?? null,
        suspendedAt: record.suspendedAt ?? null,
        suspensionReason: record.suspensionReason ?? null,
        forceDisabled: record.forceDisabled ?? null,
        restoredBy: record.restoredBy ?? null,
        restoredAt: record.restoredAt ?? null,
        revokedBy: record.revokedBy ?? null,
        revokedAt: record.revokedAt ?? null,
        revocationReason: record.revocationReason ?? null,
        updatedAt: new Date(),
      });
  }
}
