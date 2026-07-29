import type { Job } from 'bullmq';
import type { ModerationService } from './service.js';

export interface ModerationSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "moderation-selftest-job". */
export function createModerationSelfTestProcessor(service: ModerationService) {
  return async function moderationSelfTestProcessor(_job: Job<ModerationSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
