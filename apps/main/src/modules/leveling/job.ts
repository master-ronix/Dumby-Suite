import type { Job } from 'bullmq';
import type { LevelingService } from './service.js';

export interface LevelingSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "leveling-selftest-job". */
export function createLevelingSelfTestProcessor(service: LevelingService) {
  return async function levelingSelfTestProcessor(_job: Job<LevelingSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
