import type { AntiRaidService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:anti-raid-selftest-heartbeat".
 */
export const AntiRaid_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createAntiRaidSelfTestHeartbeat(service: AntiRaidService) {
  return async function anti_raidSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
