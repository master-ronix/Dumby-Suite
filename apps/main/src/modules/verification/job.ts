import type { Job } from 'bullmq';
import type { VerificationService } from './service.js';

export interface VerificationSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "verification-selftest-job". */
export function createVerificationSelfTestProcessor(service: VerificationService) {
  return async function verificationSelfTestProcessor(_job: Job<VerificationSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
