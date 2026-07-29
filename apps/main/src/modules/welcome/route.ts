import type { WelcomeService } from './service.js';

export interface RouteHandlerContext {
  service: WelcomeService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/welcome/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleWelcomeSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
