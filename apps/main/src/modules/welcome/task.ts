import type { WelcomeService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:welcome-selftest-heartbeat".
 */
export const Welcome_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createWelcomeSelfTestHeartbeat(service: WelcomeService) {
  return async function welcomeSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
