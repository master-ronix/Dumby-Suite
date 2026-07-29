import type { Job } from 'bullmq';
import type { UtilityService } from './service.js';

export interface UtilitySelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "utility-selftest-job". */
export function createUtilitySelfTestProcessor(service: UtilityService) {
  return async function utilitySelfTestProcessor(_job: Job<UtilitySelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
