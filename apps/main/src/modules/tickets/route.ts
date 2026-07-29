import type { TicketsService } from './service.js';

export interface RouteHandlerContext {
  service: TicketsService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/tickets/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleTicketsSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
