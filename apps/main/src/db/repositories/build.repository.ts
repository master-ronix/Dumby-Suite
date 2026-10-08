import type { Knex } from 'knex';

/**
 * §15.8 provenance columns on the `builds` table (migration 39). The loader reads the row named by
 * a promoted directory's `build-provenance.json` sidecar and verifies the on-disk artifact against
 * it before every import. A row missing any provenance column is not promotable and never loads.
 */
export interface BuildProvenanceRecord {
  readonly buildId: number;
  readonly moduleSlug: string;
  readonly version: string;
  readonly devId: number;
  readonly sourceArchiveHash: string | null;
  readonly artifactHash: string | null;
  readonly lockfileHash: string | null;
  readonly gateResultsHash: string | null;
  readonly sbom: unknown | null;
  readonly signature: string | null;
  readonly signatureKeyId: string | null;
  readonly signedDescriptor: string | null;
}

export interface BuildStore {
  findByBuildId(buildId: number): Promise<BuildProvenanceRecord | undefined>;
  setProvenance(record: BuildProvenanceRecord): Promise<boolean>;
}

interface BuildRow {
  buildId: number;
  moduleSlug: string;
  version: string;
  devId: number;
  sourceArchiveHash: string | null;
  artifactHash: string | null;
  lockfileHash: string | null;
  gateResultsHash: string | null;
  sbom: unknown | null;
  signature: string | null;
  signatureKeyId: string | null;
  signedDescriptor: string | null;
}

function fromRow(row: BuildRow): BuildProvenanceRecord {
  return {
    buildId: row.buildId,
    moduleSlug: row.moduleSlug,
    version: row.version,
    devId: row.devId,
    sourceArchiveHash: row.sourceArchiveHash,
    artifactHash: row.artifactHash,
    lockfileHash: row.lockfileHash,
    gateResultsHash: row.gateResultsHash,
    sbom: row.sbom,
    signature: row.signature,
    signatureKeyId: row.signatureKeyId,
    signedDescriptor: row.signedDescriptor,
  };
}

export class PostgresBuildStore implements BuildStore {
  constructor(private readonly knex: Knex) {}

  async findByBuildId(buildId: number): Promise<BuildProvenanceRecord | undefined> {
    const row = await this.knex('builds')
      .select(
        'buildId',
        'moduleSlug',
        'version',
        'devId',
        'sourceArchiveHash',
        'artifactHash',
        'lockfileHash',
        'gateResultsHash',
        'sbom',
        'signature',
        'signatureKeyId',
        'signedDescriptor',
      )
      .where({ buildId })
      .first<BuildRow | undefined>();
    return row ? fromRow(row) : undefined;
  }

  async setProvenance(record: BuildProvenanceRecord): Promise<boolean> {
    const updated = await this.knex('builds')
      .where({ buildId: record.buildId })
      .update({
        sourceArchiveHash: record.sourceArchiveHash,
        artifactHash: record.artifactHash,
        lockfileHash: record.lockfileHash,
        gateResultsHash: record.gateResultsHash,
        sbom: record.sbom === null ? null : JSON.stringify(record.sbom),
        signature: record.signature,
        signatureKeyId: record.signatureKeyId,
        signedDescriptor: record.signedDescriptor,
      });
    return updated > 0;
  }
}

/** In-memory store so the proving tests need no database (same pattern as the credential store). */
export class InMemoryBuildStore implements BuildStore {
  readonly #rows = new Map<string, BuildProvenanceRecord>();

  seed(record: BuildProvenanceRecord): this {
    this.#rows.set(record.buildId, record);
    return this;
  }

  async findByBuildId(buildId: number): Promise<BuildProvenanceRecord | undefined> {
    return this.#rows.get(buildId);
  }

  async setProvenance(record: BuildProvenanceRecord): Promise<boolean> {
    if (!this.#rows.has(record.buildId)) return false;
    this.#rows.set(record.buildId, record);
    return true;
  }
}
