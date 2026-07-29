import type { TagsService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:tags-selftest-heartbeat".
 */
export const Tags_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createTagsSelfTestHeartbeat(service: TagsService) {
  return async function tagsSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
