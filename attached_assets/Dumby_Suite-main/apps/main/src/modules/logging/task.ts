import type { LoggingService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:logging-selftest-heartbeat".
 */
export const Logging_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createLoggingSelfTestHeartbeat(service: LoggingService) {
  return async function loggingSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
