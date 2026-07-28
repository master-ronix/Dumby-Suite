import type { UtilityService } from './service.js';

export interface RouteHandlerContext {
  service: UtilityService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/utility/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleUtilitySelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
