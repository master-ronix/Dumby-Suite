import type { IntegrationsService } from './service.js';

export interface RouteHandlerContext {
  service: IntegrationsService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/integrations/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleIntegrationsSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
