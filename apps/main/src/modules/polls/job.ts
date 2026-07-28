import type { Job } from 'bullmq';
import type { PollsService } from './service.js';

export interface PollsSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "polls-selftest-job". */
export function createPollsSelfTestProcessor(service: PollsService) {
  return async function pollsSelfTestProcessor(_job: Job<PollsSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
