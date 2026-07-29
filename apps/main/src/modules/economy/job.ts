import type { Job } from 'bullmq';
import type { EconomyService } from './service.js';

export interface EconomySelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "economy-selftest-job". */
export function createEconomySelfTestProcessor(service: EconomyService) {
  return async function economySelfTestProcessor(_job: Job<EconomySelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
