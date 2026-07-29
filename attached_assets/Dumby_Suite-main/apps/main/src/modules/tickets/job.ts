import type { Job } from 'bullmq';
import type { TicketsService } from './service.js';

export interface TicketsSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "tickets-selftest-job". */
export function createTicketsSelfTestProcessor(service: TicketsService) {
  return async function ticketsSelfTestProcessor(_job: Job<TicketsSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
