import type { EconomyService } from './service.js';

export interface RouteHandlerContext {
  service: EconomyService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/economy/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleEconomySelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
