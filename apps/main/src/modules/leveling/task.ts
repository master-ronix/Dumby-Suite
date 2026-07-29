import type { LevelingService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:leveling-selftest-heartbeat".
 */
export const Leveling_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createLevelingSelfTestHeartbeat(service: LevelingService) {
  return async function levelingSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
