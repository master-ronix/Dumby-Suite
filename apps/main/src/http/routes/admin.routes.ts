import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PowerEngineDispatcher, AuditWriter } from '../power-engine-dispatcher.js';
import type { ConfigService } from '../../config/config.service.js';
import type { DbClient } from '../../db/client.js';
import type { CommandCeilingService } from '../../commands/command-ceiling.js';
import type { CollisionResolutionService } from '../../commands/collision-resolution.js';
import { PostgresDeveloperApprovalStore } from '../../db/repositories/developer-approval.repository.js';
import { decideDeveloperApproval } from '../../governance/developer-approval.js';

interface PowerEngineBody {
  actorId: string;
  source: string;
  reason: string;
}

function extractRequest(request: FastifyRequest): PowerEngineBody {
  const b = (request.body ?? {}) as Partial<PowerEngineBody>;
  return { actorId: b.actorId ?? '', source: request.ip, reason: b.reason ?? '' };
}

function sendDispatchResult(
  reply: FastifyReply,
  outcome: { ok: boolean; rejectionReason?: string },
): FastifyReply {
  if (!outcome.ok) {
    return reply.code(403).send({
      error: { code: 'DUMBY_POWER_ENGINE_REJECTED', rejectionReason: outcome.rejectionReason },
    });
  }
  return reply.code(200).send({ ok: true });
}

function sendNotImplemented(reply: FastifyReply, action: string): FastifyReply {
  return reply.code(501).send({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: `PEP action "${action}" has no backing primitive implemented yet`,
    },
  });
}

export interface AdminRoutesDeps {
  dispatcher: PowerEngineDispatcher;
  db: DbClient;
  config: ConfigService;
  auditWriter: AuditWriter;
  ceilingService?: CommandCeilingService;
  collisionResolution?: CollisionResolutionService;
  getGuildCommandCount?: (guildId: string) => Promise<number> | number;
  /** §15.8: the identities that resolve to a project owner and may decide an approval. */
  projectOwnerIds?: readonly string[];
  /** §15.8: activates a developer credential on approval (delegated to the Credentials Service). */
  credentialActivator?: { activate(keyId: string): Promise<boolean> };
}

export function registerAdminRoutes(app: FastifyInstance, deps: AdminRoutesDeps): void {
  app.get('/admin/config', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send(deps.config.redactedSnapshot());
  });

  app.get('/admin/system/maintenance-mode', async (_req: FastifyRequest, reply: FastifyReply) => {
    const row = await deps.db.knex('system_state').where({ key: 'maintenance_mode' }).first();
    return reply.code(200).send(row?.value ?? { enabled: false, reason: null });
  });

  app.post('/admin/system/maintenance-mode', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = extractRequest(req);
    const { enabled, reason } = (req.body as { enabled?: boolean; reason?: string }) ?? {};
    const outcome = await deps.dispatcher.dispatch(
      'system.maintenance-mode.set',
      body,
      async () => {
        await deps.db
          .knex('system_state')
          .where({ key: 'maintenance_mode' })
          .update({
            value: JSON.stringify({ enabled: Boolean(enabled), reason: reason ?? null }),
            updatedAt: new Date(),
          });
      },
    );
    return sendDispatchResult(reply, outcome);
  });

  app.post(
    '/admin/power-engine/guild/:guildId/suspend',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { guildId } = req.params as { guildId: string };
      const body = extractRequest(req);
      const outcome = await deps.dispatcher.dispatch('guild.suspend', body, async () => {
        await deps.db
          .knex('guilds')
          .where({ id: guildId })
          .update({ isActive: false, updatedAt: new Date() });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/guild/:guildId/restore',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { guildId } = req.params as { guildId: string };
      const body = extractRequest(req);
      const outcome = await deps.dispatcher.dispatch('guild.restore', body, async () => {
        await deps.db
          .knex('guilds')
          .where({ id: guildId })
          .update({ isActive: true, updatedAt: new Date() });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/module/:slug/suspend',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { slug } = req.params as { slug: string };
      const { guildId } = (req.body as { guildId?: string }) ?? {};
      const body = extractRequest(req);
      const outcome = await deps.dispatcher.dispatch('module.suspend', body, async () => {
        if (!guildId) throw new Error('guildId is required');

        await deps.db
          .knex('guild_module_states')
          .where({ guildId, moduleSlug: slug })
          .update({ enabled: false, state: 'disabled', updatedAt: new Date() });

        if (deps.collisionResolution) {
          await deps.collisionResolution.handleModuleDisable(guildId, slug);
        }
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/module/:slug/restore',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { slug } = req.params as { slug: string };
      const { guildId } = (req.body as { guildId?: string }) ?? {};
      const body = extractRequest(req);
      const outcome = await deps.dispatcher.dispatch('module.restore', body, async () => {
        if (!guildId) throw new Error('guildId is required');

        if (deps.ceilingService) {
          await deps.ceilingService.guard(guildId);
        }

        let targetState = 'active';
        if (deps.collisionResolution) {
          const collisions = await deps.collisionResolution.pauseOnCollision(guildId, slug);
          if (collisions.length > 0) {
            targetState = 'install_pending_resolution';
          }
        }

        await deps.db
          .knex('guild_module_states')
          .where({ guildId, moduleSlug: slug })
          .update({ enabled: true, state: targetState, updatedAt: new Date() });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post('/admin/power-engine/economy/balance-adjust', async (_req, reply) => {
    return sendNotImplemented(reply, 'economy.balance-adjust');
  });

  app.post('/admin/power-engine/rbac/role-assign', async (_req, reply) => {
    return sendNotImplemented(reply, 'rbac.role-assign');
  });

  app.post('/admin/power-engine/marketplace/review', async (_req, reply) => {
    return sendNotImplemented(reply, 'marketplace.review');
  });

  app.post('/admin/power-engine/backups/create', async (_req, reply) => {
    return sendNotImplemented(reply, 'backups.create');
  });

  app.post('/admin/power-engine/telemetry/config-update', async (_req, reply) => {
    return sendNotImplemented(reply, 'telemetry.config-update');
  });

  app.post('/admin/power-engine/sharding/rebalance', async (_req, reply) => {
    return sendNotImplemented(reply, 'sharding.rebalance');
  });

  app.post('/admin/power-engine/credentials/rotate', async (_req, reply) => {
    return sendNotImplemented(reply, 'credentials.rotate');
  });

  app.post('/admin/power-engine/audit/export', async (_req, reply) => {
    return sendNotImplemented(reply, 'audit.export');
  });

  app.post('/admin/power-engine/notifications/broadcast', async (_req, reply) => {
    return sendNotImplemented(reply, 'notifications.broadcast');
  });

  app.post('/admin/power-engine/tasks/schedule', async (_req, reply) => {
    return sendNotImplemented(reply, 'tasks.schedule');
  });

  app.post('/admin/power-engine/webhooks/rotate-secret', async (_req, reply) => {
    return sendNotImplemented(reply, 'webhooks.rotate-secret');
  });

  app.post('/admin/power-engine/cache/invalidate', async (_req, reply) => {
    return sendNotImplemented(reply, 'cache.invalidate');
  });

  app.post(
    '/admin/power-engine/feature-flags/toggle',
    async (_req: FastifyRequest, reply: FastifyReply) => {
      return sendNotImplemented(reply, 'feature-flags.toggle');
    },
  );

  app.post(
    '/admin/power-engine/suspendDeveloper',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req);
      const { devId } = (req.body ?? {}) as {
        devId?: string;
      };
      const outcome = await deps.dispatcher.dispatch('suspendDeveloper', body, async () => {
        await deps.db
          .knex('developers')
          .where({ devId })
          .update({ approvalStatus: 'declined', updatedAt: new Date() });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  // §15.8 "Owner Approval, Never Auto-Approval": the governance surface that decides a pending
  // developer approval request. Only a project owner may decide, never the subject or an
  // automation; approval transitions the developer to `approved` and activates their credential.
  const decideDeveloper = async (
    req: FastifyRequest,
    reply: FastifyReply,
    decision: 'approve' | 'decline',
  ): Promise<FastifyReply> => {
    const { devId } = req.params as { devId: string };
    const body = extractRequest(req);
    const verdict = decideDeveloperApproval({
      actorId: body.actorId,
      subjectDevId: devId,
      projectOwnerIds: deps.projectOwnerIds ?? [],
      decision,
    });
    if (verdict.kind === 'refused') {
      return reply
        .code(403)
        .send({ error: { code: 'DEVELOPER_APPROVAL_REFUSED', reason: verdict.reason } });
    }
    const status = verdict.kind === 'approved' ? 'approved' : 'declined';
    const outcome = await deps.dispatcher.dispatch(`developer.${decision}`, body, async () => {
      await new PostgresDeveloperApprovalStore(deps.db.knex).decide(
        devId,
        status,
        body.actorId,
        body.reason,
      );
      await deps.db
        .knex('developers')
        .where({ devId })
        .update({
          approvalStatus: status,
          approvedAt: status === 'approved' ? new Date() : null,
          approvedBy: status === 'approved' ? body.actorId : null,
          updatedAt: new Date(),
        });
      if (status === 'approved' && deps.credentialActivator) {
        const dev = await deps.db.knex('developers').where({ devId }).first();
        if (dev?.credentialKeyId) await deps.credentialActivator.activate(dev.credentialKeyId);
      }
    });
    return sendDispatchResult(reply, outcome);
  };

  app.post('/admin/governance/developers/:devId/approve', (req: FastifyRequest, reply: FastifyReply) =>
    decideDeveloper(req, reply, 'approve'),
  );
  app.post('/admin/governance/developers/:devId/decline', (req: FastifyRequest, reply: FastifyReply) =>
    decideDeveloper(req, reply, 'decline'),
  );

  app.post(
    '/admin/power-engine/suspendCommand',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req);
      const { commandName } = (req.body ?? {}) as { commandName?: string };
      const outcome = await deps.dispatcher.dispatch('suspendCommand', body, async () => {
        await deps.db
          .knex('guild_command_overrides')
          .insert({
            guildId: null,
            commandKey: commandName,
            overrideType: 'disabled',
            payload: JSON.stringify({ fleetWide: true }),
          })
          .onConflict(deps.db.knex.raw('("guildId", "commandKey") where "deletedAt" is null'))
          .merge({ overrideType: 'disabled', updatedAt: new Date() });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/exitMaintenanceMode',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req);
      const outcome = await deps.dispatcher.dispatch('exitMaintenanceMode', body, async () => {
        await deps.db
          .knex('system_state')
          .where({ key: 'maintenance_mode' })
          .update({
            value: JSON.stringify({ enabled: false, reason: null }),
            updatedAt: new Date(),
          });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post('/admin/power-engine/pauseQueue', async (_req: FastifyRequest, reply: FastifyReply) => {
    return sendNotImplemented(reply, 'pauseQueue');
  });

  app.post('/admin/power-engine/resumeQueue', async (_req: FastifyRequest, reply: FastifyReply) => {
    return sendNotImplemented(reply, 'resumeQueue');
  });

  app.post(
    '/admin/power-engine/requeueDeadLetter',
    async (_req: FastifyRequest, reply: FastifyReply) => {
      return sendNotImplemented(reply, 'requeueDeadLetter');
    },
  );

  app.post(
    '/admin/power-engine/overrideRateLimit',
    async (_req: FastifyRequest, reply: FastifyReply) => {
      return sendNotImplemented(reply, 'overrideRateLimit');
    },
  );

  app.post(
    '/admin/power-engine/restartShardGroup',
    async (_req: FastifyRequest, reply: FastifyReply) => {
      return sendNotImplemented(reply, 'restartShardGroup');
    },
  );

  app.post(
    '/admin/power-engine/triggerCoreRestart',
    async (_req: FastifyRequest, reply: FastifyReply) => {
      return sendNotImplemented(reply, 'triggerCoreRestart');
    },
  );

  app.post(
    '/admin/power-engine/rollbackModuleVersion',
    async (_req: FastifyRequest, reply: FastifyReply) => {
      return sendNotImplemented(reply, 'rollbackModuleVersion');
    },
  );

  app.get('/admin/power-engine/queryAuditLog', async (req: FastifyRequest, reply: FastifyReply) => {
    const { source, actorId, action, outcome, limit } = (req.query ?? {}) as {
      source?: string;
      actorId?: string;
      action?: string;
      outcome?: string;
      limit?: string;
    };
    const query = deps.db.knex('audit_logs').orderBy('createdAt', 'desc');
    if (source) query.where({ source });
    if (actorId) query.where({ actorId });
    if (action) query.where({ action });
    if (outcome === 'allowed' || outcome === 'rejected') query.where({ outcome });
    query.limit(Math.min(parseInt(limit ?? '50', 10), 200));
    const rows = await query;
    return reply.code(200).send(rows);
  });

  app.post(
    '/admin/power-engine/revokeModuleSignature',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req);
      const { moduleSlug, keyId } = (req.body ?? {}) as {
        moduleSlug?: string;
        keyId?: string;
      };
      const outcome = await deps.dispatcher.dispatch(
        'revokeModuleSignature',
        body,
        async () => {
          return deps.db
            .knex('signing_keys')
            .where({ keyId })
            .update({ revokedAt: new Date(), updatedAt: new Date() });
        },
        { metadata: { moduleSlug: moduleSlug ?? null, keyId: keyId ?? null } },
      );
      if (outcome.ok && outcome.result === 0) {
        return reply.code(404).send({
          error: {
            code: 'DUMBY_NOT_FOUND',
            message: `No signing key with keyId "${keyId}"`,
          },
        });
      }
      return sendDispatchResult(reply, outcome);
    },
  );

  app.get(
    '/admin/power-engine/command-ceiling/:guildId',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { guildId } = req.params as { guildId: string };
      if (!deps.ceilingService) {
        return reply
          .code(501)
          .send({ error: { code: 'NOT_IMPLEMENTED', message: 'Ceiling service not available' } });
      }
      const projection = await deps.ceilingService.project(guildId);
      return reply.code(200).send(projection);
    },
  );

  app.post(
    '/admin/power-engine/command-ceiling/:guildId/guard',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { guildId } = req.params as { guildId: string };
      if (!deps.ceilingService) {
        return reply
          .code(501)
          .send({ error: { code: 'NOT_IMPLEMENTED', message: 'Ceiling service not available' } });
      }
      const body = extractRequest(req);
      const outcome = await deps.dispatcher.dispatch('command-ceiling.guard', body, async () => {
        return await deps.ceilingService!.guard(guildId);
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  app.get(
    '/admin/power-engine/collisions/:guildId',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { guildId } = req.params as { guildId: string };
      if (!deps.collisionResolution) {
        return reply.code(501).send({
          error: { code: 'NOT_IMPLEMENTED', message: 'Collision resolution not available' },
        });
      }
      return reply.code(200).send({ guildId });
    },
  );

  app.post(
    '/admin/power-engine/collisions/:guildId/resolve',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { guildId } = req.params as { guildId: string };
      const { moduleSlug, commandKey, resolveInFavourOf } = (req.body ?? {}) as {
        moduleSlug?: string;
        commandKey?: string;
        resolveInFavourOf?: string;
      };
      if (!deps.collisionResolution) {
        return reply.code(501).send({
          error: { code: 'NOT_IMPLEMENTED', message: 'Collision resolution not available' },
        });
      }
      const body = extractRequest(req);
      const outcome = await deps.dispatcher.dispatch('collisions.resolve', body, async () => {
        if (!moduleSlug || !commandKey || !resolveInFavourOf) {
          throw new Error('moduleSlug, commandKey, and resolveInFavourOf are required');
        }
        return await deps.collisionResolution!.resolveCollision(
          guildId,
          moduleSlug,
          commandKey,
          resolveInFavourOf,
        );
      });
      return sendDispatchResult(reply, outcome);
    },
  );
}
