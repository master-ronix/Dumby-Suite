import type { VerificationService } from './service.js';

export interface RouteHandlerContext {
  service: VerificationService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/verification/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleVerificationSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
