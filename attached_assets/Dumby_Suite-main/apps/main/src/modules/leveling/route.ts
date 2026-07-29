import type { LevelingService } from './service.js';

export interface RouteHandlerContext {
  service: LevelingService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/leveling/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleLevelingSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
