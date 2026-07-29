import type { IntegrationsService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:integrations-selftest-heartbeat".
 */
export const Integrations_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createIntegrationsSelfTestHeartbeat(service: IntegrationsService) {
  return async function integrationsSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
