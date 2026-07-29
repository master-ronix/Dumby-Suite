import type { StarboardService } from './service.js';

export interface RouteHandlerContext {
  service: StarboardService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/starboard/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleStarboardSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
