import type { Job } from 'bullmq';
import type { AutoModerationService } from './service.js';

export interface AutoModerationSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "auto-moderation-selftest-job". */
export function createAutoModerationSelfTestProcessor(service: AutoModerationService) {
  return async function auto_moderationSelfTestProcessor(_job: Job<AutoModerationSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
