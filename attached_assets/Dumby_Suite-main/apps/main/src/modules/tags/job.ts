import type { Job } from 'bullmq';
import type { TagsService } from './service.js';

export interface TagsSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "tags-selftest-job". */
export function createTagsSelfTestProcessor(service: TagsService) {
  return async function tagsSelfTestProcessor(_job: Job<TagsSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
