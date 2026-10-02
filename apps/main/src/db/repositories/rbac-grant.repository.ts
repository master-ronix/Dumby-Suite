import type { Knex } from 'knex';
import {
  GRANT_TYPE_DB_ALIASES,
  type GrantLevel,
  type GrantType,
  type RbacGrant,
} from '../../permissions/rbac.js';
import {
  applyGrant,
  grantBoundaryViolation,
  removeGrant,
  type GrantMutationResult,
  type ModifyGrantInput,
  type RemoveGrantInput,
} from '../../permissions/grant-surface.js';

/**
 * §21 Layer 7 (R2) runtime grant writer. The pure `grant-surface.ts` logic (boundary checks +
 * apply/remove over a grant list) is the contract; this persists it to the `rbac_grants` table
 * (migration 17), which the resolver reads. `rate-limit` and the table's `quota` enum value are
 * the same grant type (`GRANT_TYPE_DB_ALIASES`).
 */
export interface GrantWriter {
  list(guildId: string): Promise<readonly RbacGrant[]>;
  apply(input: ModifyGrantInput): Promise<GrantMutationResult>;
  remove(input: RemoveGrantInput): Promise<GrantMutationResult>;
}

export interface RbacGrantRow {
  guildId: string;
  level: string;
  levelRefId: string;
  grantType: string;
  key: string;
  value: number | null;
}

function toDbGrantType(type: GrantType): string {
  const alias = (GRANT_TYPE_DB_ALIASES as Record<string, string | undefined>)[type];
  return alias ?? type;
}

function fromDbGrantType(grantType: string): GrantType {
  const alias = (GRANT_TYPE_DB_ALIASES as Record<string, string | undefined>)[grantType];
  return (alias ?? grantType) as GrantType;
}

export function grantToRow(grant: RbacGrant): RbacGrantRow {
  return {
    guildId: grant.guildId,
    level: grant.level,
    levelRefId: grant.refId,
    grantType: toDbGrantType(grant.type),
    key: grant.key,
    value: grant.value ?? null,
  };
}

export function grantFromRow(row: RbacGrantRow): RbacGrant {
  return {
    guildId: row.guildId,
    level: row.level as GrantLevel,
    refId: row.levelRefId,
    type: fromDbGrantType(row.grantType),
    key: row.key,
    ...(row.value === null ? {} : { value: row.value }),
  };
}

export class PostgresGrantWriter implements GrantWriter {
  constructor(private readonly knex: Knex) {}

  async list(guildId: string): Promise<readonly RbacGrant[]> {
    const rows = await this.knex('rbac_grants')
      .select('guildId', 'level', 'levelRefId', 'grantType', 'key', 'value')
      .where({ guildId })
      .whereNull('deletedAt');
    return rows.map((row) => grantFromRow(row as RbacGrantRow));
  }

  async apply(input: ModifyGrantInput): Promise<GrantMutationResult> {
    const violation = grantBoundaryViolation(input);
    if (violation !== null) return { ok: false, error: violation };
    // No unique constraint on the table, so the previous grant for this target is soft-deleted
    // and the new one inserted.
    await this.softDelete({
      guildId: input.guildId,
      key: input.key,
      level: input.level,
      levelRefId: input.refId,
      grantType: toDbGrantType(input.type),
    });
    await this.knex('rbac_grants').insert(
      grantToRow({
        guildId: input.guildId,
        level: input.level,
        refId: input.refId,
        type: input.type,
        key: input.key,
        ...(input.value === undefined ? {} : { value: input.value }),
      }),
    );
    return { ok: true, grants: await this.list(input.guildId) };
  }

  async remove(input: RemoveGrantInput): Promise<GrantMutationResult> {
    await this.softDelete({
      guildId: input.guildId,
      key: input.key,
      level: input.level,
      levelRefId: input.refId,
      grantType: toDbGrantType(input.type),
    });
    return { ok: true, grants: await this.list(input.guildId) };
  }

  private async softDelete(match: {
    guildId: string;
    key: string;
    level: GrantLevel;
    levelRefId: string;
    grantType: string;
  }): Promise<void> {
    await this.knex('rbac_grants')
      .where(match)
      .whereNull('deletedAt')
      .update({ deletedAt: new Date(), deletedBy: 'grant-writer' });
  }
}

/** In-memory async writer so the grant-writer tests need no database. */
export class InMemoryGrantWriter implements GrantWriter {
  #grants: readonly RbacGrant[] = [];

  constructor(initial: readonly RbacGrant[] = []) {
    this.#grants = initial;
  }

  async list(guildId: string): Promise<readonly RbacGrant[]> {
    return this.#grants.filter((g) => g.guildId === guildId);
  }

  async apply(input: ModifyGrantInput): Promise<GrantMutationResult> {
    const result = applyGrant(this.#grants, input);
    if (result.ok) this.#grants = result.grants;
    return result;
  }

  async remove(input: RemoveGrantInput): Promise<GrantMutationResult> {
    const result = removeGrant(this.#grants, input);
    if (result.ok) this.#grants = result.grants;
    return result;
  }
}
