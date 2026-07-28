import type { ModerationService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:moderation-selftest-heartbeat".
 */
export const Moderation_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createModerationSelfTestHeartbeat(service: ModerationService) {
  return async function moderationSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
