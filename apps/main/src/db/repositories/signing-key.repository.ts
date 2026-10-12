import type { Knex } from 'knex';

/**
 * UR-20261012-042 (A2.2) — the `signing_keys` registry, the documented home for build-signing
 * public keys (§15.8; finding #21: the registry holds PUBLIC keys only, never a private one).
 *
 * Config (`BUILD_SIGNING_PUBLIC_KEY`) was the only source until now, which made the runtime's trust
 * set a single deployment variable rather than the registry the spec names. The registry is now read
 * at boot and its active keys are registered alongside the configured one, so rotating a key is a
 * row change and a key can be revoked (`revokedAt`) without a redeploy.
 */
export interface SigningKeyRow {
  readonly keyId: string;
  readonly publicKey: string;
}

export interface SigningKeyStore {
  /**
   * The active (not revoked) public keys. Best-effort: returns `[]` when the registry cannot be
   * read, because provenance arming happens on the boot path and must never be able to stop boot.
   */
  listActive(): Promise<readonly SigningKeyRow[]>;
}

export class PostgresSigningKeyStore implements SigningKeyStore {
  constructor(private readonly knex: Knex) {}

  async listActive(): Promise<readonly SigningKeyRow[]> {
    try {
      const rows = await this.knex('signing_keys')
        .whereNull('revokedAt')
        .where({ active: true })
        .select('keyId', 'publicKey');
      const out: SigningKeyRow[] = [];
      for (const row of rows as { keyId?: unknown; publicKey?: unknown }[]) {
        if (typeof row.keyId === 'string' && typeof row.publicKey === 'string') {
          out.push({ keyId: row.keyId, publicKey: row.publicKey });
        }
      }
      return out;
    } catch {
      return [];
    }
  }
}
