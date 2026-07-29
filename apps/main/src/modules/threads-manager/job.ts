import type { Job } from 'bullmq';
import type { ThreadsManagerService } from './service.js';

export interface ThreadsManagerSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "threads-manager-selftest-job". */
export function createThreadsManagerSelfTestProcessor(service: ThreadsManagerService) {
  return async function threads_managerSelfTestProcessor(_job: Job<ThreadsManagerSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
