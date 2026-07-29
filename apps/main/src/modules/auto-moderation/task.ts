import type { AutoModerationService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:auto-moderation-selftest-heartbeat".
 */
export const AutoModeration_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createAutoModerationSelfTestHeartbeat(service: AutoModerationService) {
  return async function auto_moderationSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
