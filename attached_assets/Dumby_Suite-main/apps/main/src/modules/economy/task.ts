import type { EconomyService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:economy-selftest-heartbeat".
 */
export const Economy_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createEconomySelfTestHeartbeat(service: EconomyService) {
  return async function economySelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
