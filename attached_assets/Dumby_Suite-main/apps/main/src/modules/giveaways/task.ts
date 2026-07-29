import type { GiveawaysService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:giveaways-selftest-heartbeat".
 */
export const Giveaways_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createGiveawaysSelfTestHeartbeat(service: GiveawaysService) {
  return async function giveawaysSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
