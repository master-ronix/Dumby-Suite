import type { Job } from 'bullmq';
import type { IntegrationsService } from './service.js';

export interface IntegrationsSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "integrations-selftest-job". */
export function createIntegrationsSelfTestProcessor(service: IntegrationsService) {
  return async function integrationsSelfTestProcessor(_job: Job<IntegrationsSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
