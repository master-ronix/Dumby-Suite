import type { Job } from 'bullmq';
import type { CoreAdminService } from './service.js';

export interface CoreAdminSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "core-admin-selftest-job". */
export function createCoreAdminSelfTestProcessor(service: CoreAdminService) {
  return async function core_adminSelfTestProcessor(_job: Job<CoreAdminSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
