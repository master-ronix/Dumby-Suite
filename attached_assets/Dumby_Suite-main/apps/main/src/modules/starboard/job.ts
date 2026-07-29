import type { Job } from 'bullmq';
import type { StarboardService } from './service.js';

export interface StarboardSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "starboard-selftest-job". */
export function createStarboardSelfTestProcessor(service: StarboardService) {
  return async function starboardSelfTestProcessor(_job: Job<StarboardSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
