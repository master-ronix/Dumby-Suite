import type { BirthdaysService } from './service.js';

export interface RouteHandlerContext {
  service: BirthdaysService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/birthdays/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleBirthdaysSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
