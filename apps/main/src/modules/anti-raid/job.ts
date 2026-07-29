import type { Job } from 'bullmq';
import type { AntiRaidService } from './service.js';

export interface AntiRaidSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "anti-raid-selftest-job". */
export function createAntiRaidSelfTestProcessor(service: AntiRaidService) {
  return async function anti_raidSelfTestProcessor(_job: Job<AntiRaidSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
