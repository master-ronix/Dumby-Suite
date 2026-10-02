import type { Knex } from 'knex';
import type { ApprovalSubjectType } from '../../governance/approval.js';

/** §15.8: one generic approvals ledger row. */
export interface ApprovalRecord {
  readonly requestId: string;
  readonly subjectType: ApprovalSubjectType;
  readonly subjectId: string;
  readonly status: 'pending' | 'approved' | 'declined';
  readonly requestedBy: string | null;
  readonly decidedBy: string | null;
  readonly decidedAt: Date | null;
  readonly reason: string | null;
  readonly createdAt: Date;
}

export interface ApprovalStore {
  requestPending(
    subjectType: ApprovalSubjectType,
    subjectId: string,
    requestedBy?: string,
  ): Promise<void>;
  findPending(
    subjectType: ApprovalSubjectType,
    subjectId: string,
  ): Promise<ApprovalRecord | undefined>;
  decide(
    subjectType: ApprovalSubjectType,
    subjectId: string,
    status: 'approved' | 'declined',
    decidedBy: string,
    reason: string,
  ): Promise<boolean>;
}

interface ApprovalRow {
  requestId: string;
  subjectType: string;
  subjectId: string;
  status: string;
  requestedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | Date | null;
  reason: string | null;
  createdAt: string | Date;
}

function fromRow(row: ApprovalRow): ApprovalRecord {
  return {
    requestId: row.requestId,
    subjectType: row.subjectType as ApprovalSubjectType,
    subjectId: row.subjectId,
    status: row.status as ApprovalRecord['status'],
    requestedBy: row.requestedBy,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt === null ? null : new Date(row.decidedAt),
    reason: row.reason,
    createdAt: new Date(row.createdAt),
  };
}

export class PostgresApprovalStore implements ApprovalStore {
  constructor(private readonly knex: Knex) {}

  async requestPending(
    subjectType: ApprovalSubjectType,
    subjectId: string,
    requestedBy?: string,
  ): Promise<void> {
    await this.knex('approvals')
      .insert({ subjectType, subjectId, requestedBy: requestedBy ?? null, status: 'pending' })
      .onConflict(
        this.knex.raw('("subjectType", "subjectId") where "status" = \'pending\''),
      )
      .ignore();
  }

  async findPending(
    subjectType: ApprovalSubjectType,
    subjectId: string,
  ): Promise<ApprovalRecord | undefined> {
    const row = await this.knex('approvals')
      .where({ subjectType, subjectId, status: 'pending' })
      .first<ApprovalRow | undefined>();
    return row ? fromRow(row) : undefined;
  }

  async decide(
    subjectType: ApprovalSubjectType,
    subjectId: string,
    status: 'approved' | 'declined',
    decidedBy: string,
    reason: string,
  ): Promise<boolean> {
    const updated = await this.knex('approvals')
      .where({ subjectType, subjectId, status: 'pending' })
      .update({ status, decidedBy, decidedAt: new Date(), reason });
    if (updated > 0) return true;
    await this.knex('approvals').insert({
      subjectType,
      subjectId,
      status,
      decidedBy,
      decidedAt: new Date(),
      reason,
    });
    return true;
  }
}

/** In-memory store so the approval tests need no database. */
export class InMemoryApprovalStore implements ApprovalStore {
  readonly #rows: ApprovalRecord[] = [];

  async requestPending(
    subjectType: ApprovalSubjectType,
    subjectId: string,
    requestedBy?: string,
  ): Promise<void> {
    if (this.#rows.some((r) => r.subjectType === subjectType && r.subjectId === subjectId && r.status === 'pending')) {
      return;
    }
    this.#rows.push({
      requestId: `req-${this.#rows.length + 1}`,
      subjectType,
      subjectId,
      status: 'pending',
      requestedBy: requestedBy ?? null,
      decidedBy: null,
      decidedAt: null,
      reason: null,
      createdAt: new Date(),
    });
  }

  async findPending(
    subjectType: ApprovalSubjectType,
    subjectId: string,
  ): Promise<ApprovalRecord | undefined> {
    return this.#rows.find(
      (r) => r.subjectType === subjectType && r.subjectId === subjectId && r.status === 'pending',
    );
  }

  async decide(
    subjectType: ApprovalSubjectType,
    subjectId: string,
    status: 'approved' | 'declined',
    decidedBy: string,
    reason: string,
  ): Promise<boolean> {
    const pending = this.#rows.find(
      (r) => r.subjectType === subjectType && r.subjectId === subjectId && r.status === 'pending',
    );
    if (pending) {
      this.#rows[this.#rows.indexOf(pending)] = {
        ...pending,
        status,
        decidedBy,
        decidedAt: new Date(),
        reason,
      };
      return true;
    }
    this.#rows.push({
      requestId: `req-${this.#rows.length + 1}`,
      subjectType,
      subjectId,
      status,
      requestedBy: null,
      decidedBy,
      decidedAt: new Date(),
      reason,
      createdAt: new Date(),
    });
    return true;
  }
}
