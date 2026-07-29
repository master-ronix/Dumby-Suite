import type { PollsService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:polls-selftest-heartbeat".
 */
export const Polls_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createPollsSelfTestHeartbeat(service: PollsService) {
  return async function pollsSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
