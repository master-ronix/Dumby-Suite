import type { UtilityService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:utility-selftest-heartbeat".
 */
export const Utility_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createUtilitySelfTestHeartbeat(service: UtilityService) {
  return async function utilitySelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
