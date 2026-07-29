import type { Job } from 'bullmq';
import type { RemindersService } from './service.js';

export interface RemindersSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "reminders-selftest-job". */
export function createRemindersSelfTestProcessor(service: RemindersService) {
  return async function remindersSelfTestProcessor(_job: Job<RemindersSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
