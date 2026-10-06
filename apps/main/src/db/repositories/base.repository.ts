import type { Knex } from 'knex';

export interface EntityRow {
  id: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  /** §24.5 — snowflake or service-identity string; null ⇒ system-generated. */
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | string | null;
  deletedBy?: string | null;
}

export abstract class BaseRepository<Row extends EntityRow> {
  protected constructor(
    protected readonly knex: Knex,
    protected readonly tableName: string,
    protected readonly softDeletable: boolean = true,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected table(): Knex.QueryBuilder<any, any[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.knex<any>(this.tableName);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected notDeleted<Q extends Knex.QueryBuilder<any, any>>(query: Q): Q {
    if (!this.softDeletable) return query;
    return query.whereNull('deletedAt') as Q;
  }

  async findById(id: string, includeDeleted = false): Promise<Row | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: Knex.QueryBuilder<any, any> = this.table().where({ id });
    if (!includeDeleted) query = this.notDeleted(query);
    return (await query.first()) as Row | undefined;
  }

  async list(limit = 50, offset = 0): Promise<Row[]> {
    return (await this.notDeleted(this.table()).limit(limit).offset(offset)) as Row[];
  }

  async softDelete(id: string, deletedBy: string): Promise<number> {
    if (!this.softDeletable) {
      throw new Error(`Table "${this.tableName}" is not soft-deletable`);
    }
    return (await this.table()
      .where({ id })
      .update({ deletedAt: new Date(), deletedBy })) as number;
  }

  async hardDeleteById(id: string): Promise<number> {
    return (await this.table().where({ id }).delete()) as number;
  }
}

export abstract class InsertOnlyRepository<Row extends { id: string }> {
  protected constructor(
    protected readonly knex: Knex,
    protected readonly tableName: string,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected table(): Knex.QueryBuilder<any, any[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.knex<any>(this.tableName);
  }

  async insert(row: Row): Promise<void> {
    await this.table().insert(row);
  }

  async findById(id: string): Promise<Row | undefined> {
    return (await this.table().where({ id }).first()) as Row | undefined;
  }

  update(): never {
    throw new Error(
      `Table "${this.tableName}" is insert-only: update() is forbidden by repository design.`,
    );
  }

  delete(): never {
    throw new Error(
      `Table "${this.tableName}" is insert-only: delete() is forbidden by repository design.`,
    );
  }
}
