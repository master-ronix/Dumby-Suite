import type { GuildSettingsService } from './service.js';

export interface RouteHandlerContext {
  service: GuildSettingsService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/guild-settings/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleGuildSettingsSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
