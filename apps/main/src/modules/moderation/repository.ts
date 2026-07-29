import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import type { SelfTestRepository, SelfTestRunRecord } from './service.js';

/**
 * ModerationRepository — the module's one provided repository, backed by the
 * module-owned table "mod_moderation_selftest" created in migrations/. This is the only
 * file in the module that touches Postgres directly.
 */
export class ModerationRepository implements SelfTestRepository {
  constructor(private readonly knex: Knex) {}

  async recordRun(status: 'pass' | 'fail', details: Record<string, unknown>): Promise<SelfTestRunRecord> {
    const id = randomUUID();
    const ranAt = new Date().toISOString();
    await this.knex('mod_moderation_selftest').insert({
      id,
      status,
      details: JSON.stringify(details),
      ranAt,
    });
    return { id, status, details, ranAt };
  }

  async countRuns(): Promise<number> {
    const row = await this.knex('mod_moderation_selftest').whereNull('deletedAt').count<{ count: string }>('id as count').first();
    return Number(row?.count ?? 0);
  }
}
