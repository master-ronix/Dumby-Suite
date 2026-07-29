import type { ModerationService } from './service.js';

export interface RouteHandlerContext {
  service: ModerationService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/moderation/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleModerationSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
