import type { GiveawaysService } from './service.js';

export interface RouteHandlerContext {
  service: GiveawaysService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/giveaways/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleGiveawaysSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
