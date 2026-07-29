import type { LoggingService } from './service.js';

export interface RouteHandlerContext {
  service: LoggingService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/logging/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleLoggingSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
