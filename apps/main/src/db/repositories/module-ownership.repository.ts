import type { Knex } from 'knex';
import type {
  ModuleOwnershipRecord,
  ModuleOwnershipStore,
} from '../../module-system/module-ownership.js';

interface ModuleRow {
  slug: string;
  ownerDevId: string;
  createdAt: string | Date;
  ownershipTransferredAt: string | Date | null;
}

function fromRow(row: ModuleRow): ModuleOwnershipRecord {
  return {
    slug: row.slug,
    ownerDevId: row.ownerDevId,
    createdAt: new Date(row.createdAt),
    ownershipTransferredAt:
      row.ownershipTransferredAt === null ? null : new Date(row.ownershipTransferredAt),
  };
}

export class PostgresModuleOwnershipStore implements ModuleOwnershipStore {
  constructor(private readonly knex: Knex) {}

  async findBySlug(slug: string): Promise<ModuleOwnershipRecord | undefined> {
    const row = await this.knex('modules')
      .select('slug', 'ownerDevId', 'createdAt', 'ownershipTransferredAt')
      .where({ slug })
      .first<ModuleRow | undefined>();
    return row ? fromRow(row) : undefined;
  }

  async claim(slug: string, ownerDevId: string): Promise<boolean> {
    const inserted = await this.knex('modules')
      .insert({ slug, ownerDevId })
      .onConflict('slug')
      .ignore()
      .returning('slug');
    return inserted.length > 0;
  }

  async transfer(slug: string, toDevId: string): Promise<boolean> {
    const updated = await this.knex('modules')
      .where({ slug })
      .update({ ownerDevId: toDevId, ownershipTransferredAt: new Date() });
    return updated > 0;
  }
}

/** In-memory store so the ownership tests need no database (same pattern as the other stores). */
export class InMemoryModuleOwnershipStore implements ModuleOwnershipStore {
  readonly #rows = new Map<string, ModuleOwnershipRecord>();

  seed(record: ModuleOwnershipRecord): this {
    this.#rows.set(record.slug, record);
    return this;
  }

  async findBySlug(slug: string): Promise<ModuleOwnershipRecord | undefined> {
    return this.#rows.get(slug);
  }

  async claim(slug: string, ownerDevId: string): Promise<boolean> {
    if (this.#rows.has(slug)) return false;
    this.#rows.set(slug, {
      slug,
      ownerDevId,
      createdAt: new Date(),
      ownershipTransferredAt: null,
    });
    return true;
  }

  async transfer(slug: string, toDevId: string): Promise<boolean> {
    const existing = this.#rows.get(slug);
    if (existing === undefined) return false;
    this.#rows.set(slug, { ...existing, ownerDevId: toDevId, ownershipTransferredAt: new Date() });
    return true;
  }
}
