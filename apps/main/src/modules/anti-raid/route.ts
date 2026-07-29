import type { AntiRaidService } from './service.js';

export interface RouteHandlerContext {
  service: AntiRaidService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/anti-raid/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleAntiRaidSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
