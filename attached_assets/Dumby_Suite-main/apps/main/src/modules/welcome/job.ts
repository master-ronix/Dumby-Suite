import type { Job } from 'bullmq';
import type { WelcomeService } from './service.js';

export interface WelcomeSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "welcome-selftest-job". */
export function createWelcomeSelfTestProcessor(service: WelcomeService) {
  return async function welcomeSelfTestProcessor(_job: Job<WelcomeSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
