import type { Job } from 'bullmq';
import type { GiveawaysService } from './service.js';

export interface GiveawaysSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "giveaways-selftest-job". */
export function createGiveawaysSelfTestProcessor(service: GiveawaysService) {
  return async function giveawaysSelfTestProcessor(_job: Job<GiveawaysSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
