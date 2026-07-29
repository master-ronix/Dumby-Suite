import type { CoreAdminService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:core-admin-selftest-heartbeat".
 */
export const CoreAdmin_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createCoreAdminSelfTestHeartbeat(service: CoreAdminService) {
  return async function core_adminSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
