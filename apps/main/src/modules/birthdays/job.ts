import type { Job } from 'bullmq';
import type { BirthdaysService } from './service.js';

export interface BirthdaysSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "birthdays-selftest-job". */
export function createBirthdaysSelfTestProcessor(service: BirthdaysService) {
  return async function birthdaysSelfTestProcessor(_job: Job<BirthdaysSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
