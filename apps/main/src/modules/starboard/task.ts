import type { StarboardService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:starboard-selftest-heartbeat".
 */
export const Starboard_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createStarboardSelfTestHeartbeat(service: StarboardService) {
  return async function starboardSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
