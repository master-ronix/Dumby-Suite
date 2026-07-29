/**
 * AntiRaidService — the module's one provided service. Deliberately free of
 * any database/queue/HTTP import: it depends only on the small
 * SelfTestRepository interface below, so it can be unit tested with an
 * in-memory fake (see tests/unit/modules/generated-modules.test.ts)
 * without a live Postgres connection.
 */

export interface SelfTestRunRecord {
  id: string;
  status: 'pass' | 'fail';
  details: Record<string, unknown>;
  ranAt: string;
}

export interface SelfTestRepository {
  recordRun(status: 'pass' | 'fail', details: Record<string, unknown>): Promise<SelfTestRunRecord>;
  countRuns(): Promise<number>;
}

export interface DomainEventEmitter {
  emit(eventName: string, payload: unknown): Promise<void>;
}

export interface SelfTestResult {
  ok: boolean;
  moduleSlug: string;
  details: Record<string, unknown>;
}

export class AntiRaidService {
  constructor(
    private readonly repository: SelfTestRepository,
    private readonly eventBus?: DomainEventEmitter,
  ) {}

  async selfTest(): Promise<SelfTestResult> {
    const details = { module: 'anti-raid', ranAt: new Date().toISOString() };
    await this.repository.recordRun('pass', details);
    await this.eventBus?.emit('anti-raid.selftest.executed', details);
    return { ok: true, moduleSlug: 'anti-raid', details };
  }

  async status(): Promise<{ moduleSlug: string; totalRuns: number }> {
    const totalRuns = await this.repository.countRuns();
    return { moduleSlug: 'anti-raid', totalRuns };
  }
}
