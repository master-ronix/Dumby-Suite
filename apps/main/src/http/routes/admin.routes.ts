import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PowerEngineDispatcher, AuditWriter } from '../power-engine-dispatcher.js';
import type { ConfigService } from '../../config/config.service.js';
import type { DbClient } from '../../db/client.js';

interface PowerEngineBody {
  actorId: string;
  source: string;
  reason: string;
}

function extractRequest(body: unknown): PowerEngineBody {
  const b = (body ?? {}) as Partial<PowerEngineBody>;
  return { actorId: b.actorId ?? '', source: b.source ?? '', reason: b.reason ?? '' };
}

function sendDispatchResult(reply: FastifyReply, outcome: { ok: boolean; rejectionReason?: string }): FastifyReply {
  if (!outcome.ok) {
    return reply.code(403).send({ error: { code: 'DUMBY_POWER_ENGINE_REJECTED', rejectionReason: outcome.rejectionReason } });
  }
  return reply.code(200).send({ ok: true });
}

export interface AdminRoutesDeps {
  dispatcher: PowerEngineDispatcher;
  db: DbClient;
  config: ConfigService;
  auditWriter: AuditWriter;
}

/**
 * A representative slice of the ~60-endpoint admin/Power-Engine-Panel
 * surface (spec section 21). Every mutating route follows the exact same
 * three lines: extract {actorId, source, reason} -> dispatcher.dispatch()
 * -> sendDispatchResult(). The remaining PEP domains (economy, RBAC,
 * marketplace review, backups, telemetry, sharding, ...) register with
 * this identical pattern; see STATUS_AND_VERIFICATION.md for the full
 * endpoint checklist and what is wired here vs. left as a follow-up.
 */
export function registerAdminRoutes(app: FastifyInstance, deps: AdminRoutesDeps): void {
  app.get('/admin/config', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send(deps.config.redactedSnapshot());
  });

  app.get('/admin/system/maintenance-mode', async (_req: FastifyRequest, reply: FastifyReply) => {
    const row = await deps.db.knex('system_state').where({ key: 'maintenance_mode' }).first();
    return reply.code(200).send(row?.value ?? { enabled: false, reason: null });
  });

  app.post('/admin/system/maintenance-mode', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = extractRequest(req.body);
    const { enabled, reason } = (req.body as { enabled?: boolean; reason?: string }) ?? {};
    const outcome = await deps.dispatcher.dispatch('system.maintenance-mode.set', body, async () => {
      await deps.db.knex('system_state')
        .where({ key: 'maintenance_mode' })
        .update({ value: JSON.stringify({ enabled: Boolean(enabled), reason: reason ?? null }), updatedAt: new Date() });
    });
    return sendDispatchResult(reply, outcome);
  });

  app.post('/admin/power-engine/guild/:guildId/suspend', async (req: FastifyRequest, reply: FastifyReply) => {
    const { guildId } = req.params as { guildId: string };
    const body = extractRequest(req.body);
    const outcome = await deps.dispatcher.dispatch('guild.suspend', body, async () => {
      await deps.db.knex('guilds').where({ id: guildId }).update({ isActive: false, updatedAt: new Date() });
    });
    return sendDispatchResult(reply, outcome);
  });

  app.post('/admin/power-engine/guild/:guildId/restore', async (req: FastifyRequest, reply: FastifyReply) => {
    const { guildId } = req.params as { guildId: string };
    const body = extractRequest(req.body);
    const outcome = await deps.dispatcher.dispatch('guild.restore', body, async () => {
      await deps.db.knex('guilds').where({ id: guildId }).update({ isActive: true, updatedAt: new Date() });
    });
    return sendDispatchResult(reply, outcome);
  });

  app.post('/admin/power-engine/module/:slug/suspend', async (req: FastifyRequest, reply: FastifyReply) => {
    const { slug } = req.params as { slug: string };
    const { guildId } = (req.body as { guildId?: string }) ?? {};
    const body = extractRequest(req.body);
    const outcome = await deps.dispatcher.dispatch('module.suspend', body, async () => {
      await deps.db.knex('guild_module_states')
        .where({ guildId, moduleSlug: slug })
        .update({ enabled: false, state: 'disabled', updatedAt: new Date() });
    });
    return sendDispatchResult(reply, outcome);
  });

  app.post('/admin/power-engine/module/:slug/restore', async (req: FastifyRequest, reply: FastifyReply) => {
    const { slug } = req.params as { slug: string };
    const { guildId } = (req.body as { guildId?: string }) ?? {};
    const body = extractRequest(req.body);
    const outcome = await deps.dispatcher.dispatch('module.restore', body, async () => {
      await deps.db.knex('guild_module_states')
        .where({ guildId, moduleSlug: slug })
        .update({ enabled: true, state: 'active', updatedAt: new Date() });
    });
    return sendDispatchResult(reply, outcome);
  });
}
