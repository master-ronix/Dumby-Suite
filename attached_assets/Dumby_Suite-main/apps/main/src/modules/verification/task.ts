import type { VerificationService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:verification-selftest-heartbeat".
 */
export const Verification_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createVerificationSelfTestHeartbeat(service: VerificationService) {
  return async function verificationSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
