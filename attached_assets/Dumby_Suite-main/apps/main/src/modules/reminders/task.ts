import type { RemindersService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:reminders-selftest-heartbeat".
 */
export const Reminders_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createRemindersSelfTestHeartbeat(service: RemindersService) {
  return async function remindersSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
