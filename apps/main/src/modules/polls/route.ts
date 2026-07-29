import type { PollsService } from './service.js';

export interface RouteHandlerContext {
  service: PollsService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/polls/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handlePollsSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
