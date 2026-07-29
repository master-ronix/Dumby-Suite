import type { ReactionRolesService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:reaction-roles-selftest-heartbeat".
 */
export const ReactionRoles_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createReactionRolesSelfTestHeartbeat(service: ReactionRolesService) {
  return async function reaction_rolesSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
