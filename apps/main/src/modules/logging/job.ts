import type { Job } from 'bullmq';
import type { LoggingService } from './service.js';

export interface LoggingSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "logging-selftest-job". */
export function createLoggingSelfTestProcessor(service: LoggingService) {
  return async function loggingSelfTestProcessor(_job: Job<LoggingSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
