import type { BirthdaysService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:birthdays-selftest-heartbeat".
 */
export const Birthdays_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createBirthdaysSelfTestHeartbeat(service: BirthdaysService) {
  return async function birthdaysSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
