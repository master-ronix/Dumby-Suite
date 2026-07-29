import type { ThreadsManagerService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:threads-manager-selftest-heartbeat".
 */
export const ThreadsManager_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createThreadsManagerSelfTestHeartbeat(service: ThreadsManagerService) {
  return async function threads_managerSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
