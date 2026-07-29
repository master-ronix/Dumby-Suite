import type { TicketsService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:tickets-selftest-heartbeat".
 */
export const Tickets_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createTicketsSelfTestHeartbeat(service: TicketsService) {
  return async function ticketsSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
