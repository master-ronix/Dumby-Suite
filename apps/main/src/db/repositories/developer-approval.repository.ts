import type { Knex } from 'knex';

/** §15.8 owner approval workflow: the pending request a refused deploy creates, and its decision. */
export interface DeveloperApprovalRecord {
  readonly requestId: string;
  readonly devId: string;
  readonly status: 'pending' | 'approved' | 'declined';
  readonly requestedAt: Date;
  readonly decidedBy: string | null;
  readonly decidedAt: Date | null;
  readonly reason: string | null;
}

export interface DeveloperApprovalStore {
  /** Create the pending request for a developer if none is open (§15.8). */
  requestPending(devId: string): Promise<void>;
  findPending(devId: string): Promise<DeveloperApprovalRecord | undefined>;
  /** Decide the open request; if none is open, record the decision as a fresh row. */
  decide(
    devId: string,
    status: 'approved' | 'declined',
    decidedBy: string,
    reason: string,
  ): Promise<boolean>;
}

interface ApprovalRow {
  requestId: string;
  devId: string;
  status: string;
  requestedAt: string | Date;
  decidedBy: string | null;
  decidedAt: string | Date | null;
  reason: string | null;
}

function fromRow(row: ApprovalRow): DeveloperApprovalRecord {
  return {
    requestId: row.requestId,
    devId: row.devId,
    status: row.status as DeveloperApprovalRecord['status'],
    requestedAt: new Date(row.requestedAt),
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt === null ? null : new Date(row.decidedAt),
    reason: row.reason,
  };
}

export class PostgresDeveloperApprovalStore implements DeveloperApprovalStore {
  constructor(private readonly knex: Knex) {}

  async requestPending(devId: string): Promise<void> {
    await this.knex('developer_approvals')
      .insert({ devId, status: 'pending' })
      .onConflict(this.knex.raw('("devId") where "status" = \'pending\''))
      .ignore();
  }

  async findPending(devId: string): Promise<DeveloperApprovalRecord | undefined> {
    const row = await this.knex('developer_approvals')
      .where({ devId, status: 'pending' })
      .first<ApprovalRow | undefined>();
    return row ? fromRow(row) : undefined;
  }

  async decide(
    devId: string,
    status: 'approved' | 'declined',
    decidedBy: string,
    reason: string,
  ): Promise<boolean> {
    const updated = await this.knex('developer_approvals')
      .where({ devId, status: 'pending' })
      .update({ status, decidedBy, decidedAt: new Date(), reason });
    if (updated > 0) return true;
    await this.knex('developer_approvals').insert({
      devId,
      status,
      decidedBy,
      decidedAt: new Date(),
      reason,
    });
    return true;
  }
}

/** In-memory store so the approval tests need no database. */
export class InMemoryDeveloperApprovalStore implements DeveloperApprovalStore {
  readonly #rows: DeveloperApprovalRecord[] = [];

  async requestPending(devId: string): Promise<void> {
    if (this.#rows.some((r) => r.devId === devId && r.status === 'pending')) return;
    this.#rows.push({
      requestId: `req-${this.#rows.length + 1}`,
      devId,
      status: 'pending',
      requestedAt: new Date(),
      decidedBy: null,
      decidedAt: null,
      reason: null,
    });
  }

  async findPending(devId: string): Promise<DeveloperApprovalRecord | undefined> {
    return this.#rows.find((r) => r.devId === devId && r.status === 'pending');
  }

  async decide(
    devId: string,
    status: 'approved' | 'declined',
    decidedBy: string,
    reason: string,
  ): Promise<boolean> {
    const pending = this.#rows.find((r) => r.devId === devId && r.status === 'pending');
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
      devId,
      status,
      requestedAt: new Date(),
      decidedBy,
      decidedAt: new Date(),
      reason,
    });
    return true;
  }
}
