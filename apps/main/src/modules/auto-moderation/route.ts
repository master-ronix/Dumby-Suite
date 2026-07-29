import type { AutoModerationService } from './service.js';

export interface RouteHandlerContext {
  service: AutoModerationService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/auto-moderation/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleAutoModerationSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
