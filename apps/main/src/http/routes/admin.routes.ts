import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PowerEngineDispatcher, AuditWriter } from '../power-engine-dispatcher.js';
import type { ConfigService } from '../../config/config.service.js';
import type { DbClient } from '../../db/client.js';
import type { CommandCeilingService } from '../../commands/command-ceiling.js';
import type { CollisionResolutionService } from '../../commands/collision-resolution.js';

interface PowerEngineBody {
  actorId: string;
  source: string;
  reason: string;
}

function extractRequest(body: unknown): PowerEngineBody {
  const b = (body ?? {}) as Partial<PowerEngineBody>;
  return { actorId: b.actorId ?? '', source: b.source ?? '', reason: b.reason ?? '' };
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

export interface AdminRoutesDeps {
  dispatcher: PowerEngineDispatcher;
  db: DbClient;
  config: ConfigService;
  auditWriter: AuditWriter;
  ceilingService?: CommandCeilingService;
  collisionResolution?: CollisionResolutionService;
  /** Counts the total active commands across all modules for a guild. Default: queries guild_module_states + manifest commands. */
  getGuildCommandCount?: (guildId: string) => Promise<number> | number;
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
      const body = extractRequest(req.body);
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
      const body = extractRequest(req.body);
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
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('module.suspend', body, async () => {
        if (!guildId) throw new Error('guildId is required');

        await deps.db
          .knex('guild_module_states')
          .where({ guildId, moduleSlug: slug })
          .update({ enabled: false, state: 'disabled', updatedAt: new Date() });

        // Re-evaluate collisions: if a winning module is disabled, its overrides are released
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
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('module.restore', body, async () => {
        if (!guildId) throw new Error('guildId is required');

        // 1. Enforce command ceiling before restoring
        if (deps.ceilingService) {
          await deps.ceilingService.guard(guildId);
        }

        // 2. Detect collisions — if any exist, set install_pending_resolution instead of active
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

  app.post(
    '/admin/power-engine/economy/balance-adjust',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch(
        'economy.balance-adjust',
        body,
        async () => {},
      );
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/rbac/role-assign',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('rbac.role-assign', body, async () => {});
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/marketplace/review',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('marketplace.review', body, async () => {});
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/backups/create',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('backups.create', body, async () => {});
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/telemetry/config-update',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch(
        'telemetry.config-update',
        body,
        async () => {},
      );
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/sharding/rebalance',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('sharding.rebalance', body, async () => {});
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/credentials/rotate',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('credentials.rotate', body, async () => {});
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post('/admin/power-engine/audit/export', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = extractRequest(req.body);
    const outcome = await deps.dispatcher.dispatch('audit.export', body, async () => {});
    return sendDispatchResult(reply, outcome);
  });

  app.post(
    '/admin/power-engine/notifications/broadcast',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch(
        'notifications.broadcast',
        body,
        async () => {},
      );
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/tasks/schedule',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('tasks.schedule', body, async () => {});
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/webhooks/rotate-secret',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch(
        'webhooks.rotate-secret',
        body,
        async () => {},
      );
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/cache/invalidate',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('cache.invalidate', body, async () => {});
      return sendDispatchResult(reply, outcome);
    },
  );

  app.post(
    '/admin/power-engine/feature-flags/toggle',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('feature-flags.toggle', body, async () => {});
      return sendDispatchResult(reply, outcome);
    },
  );

  // ── Blueprint §22.3 — PEP 17 Control Domains ────────────────────────

  // 3. suspendDeveloper — block every module by a devId from deploying
  app.post(
    '/admin/power-engine/suspendDeveloper',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
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

  // 4. suspendCommand — disable one specific command fleet-wide
  app.post(
    '/admin/power-engine/suspendCommand',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const { commandName } = (req.body ?? {}) as { commandName?: string };
      const outcome = await deps.dispatcher.dispatch('suspendCommand', body, async () => {
        await deps.db
          .knex('guild_command_overrides')
          .insert({
            commandKey: commandName,
            overrideType: 'disabled',
            payload: JSON.stringify({ fleetWide: true }),
            updatedAt: new Date(),
          })
          .onConflict(['guildId', 'commandKey'])
          .merge({ overrideType: 'disabled', updatedAt: new Date() });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  // 6. exitMaintenanceMode — clear maintenance flag
  app.post(
    '/admin/power-engine/exitMaintenanceMode',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
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

  // 8. pauseQueue — pause a BullMQ queue
  app.post('/admin/power-engine/pauseQueue', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = extractRequest(req.body);
    const { queueName } = (req.body ?? {}) as { queueName?: string };
    const outcome = await deps.dispatcher.dispatch('pauseQueue', body, async () => {
      await deps.db
        .knex('system_state')
        .insert({
          key: `queue_paused:${queueName}`,
          value: JSON.stringify({ paused: true, at: new Date().toISOString() }),
        })
        .onConflict('key')
        .merge({ value: JSON.stringify({ paused: true, at: new Date().toISOString() }) });
    });
    return sendDispatchResult(reply, outcome);
  });

  // 9. resumeQueue — resume a paused BullMQ queue
  app.post('/admin/power-engine/resumeQueue', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = extractRequest(req.body);
    const { queueName } = (req.body ?? {}) as { queueName?: string };
    const outcome = await deps.dispatcher.dispatch('resumeQueue', body, async () => {
      await deps.db
        .knex('system_state')
        .where({ key: `queue_paused:${queueName}` })
        .del();
    });
    return sendDispatchResult(reply, outcome);
  });

  // 10. requeueDeadLetter — re-enqueue a dead-lettered job
  app.post(
    '/admin/power-engine/requeueDeadLetter',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const { jobId, queueName } = (req.body ?? {}) as {
        jobId?: string;
        queueName?: string;
      };
      const outcome = await deps.dispatcher.dispatch('requeueDeadLetter', body, async () => {
        await deps.db
          .knex('system_state')
          .insert({
            key: `deadletter-requeue:${jobId}`,
            value: JSON.stringify({ queueName, jobId, requeuedAt: new Date().toISOString() }),
          })
          .onConflict('key')
          .merge({});
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  // 11. overrideRateLimit — temporarily bypass rate limit for a user/guild
  app.post(
    '/admin/power-engine/overrideRateLimit',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const { targetType, targetId, expiresAt } = (req.body ?? {}) as {
        targetType?: 'user' | 'guild';
        targetId?: string;
        expiresAt?: string;
      };
      const outcome = await deps.dispatcher.dispatch('overrideRateLimit', body, async () => {
        await deps.db
          .knex('system_state')
          .insert({
            key: `ratelimit-override:${targetType}:${targetId}`,
            value: JSON.stringify({ expiresAt }),
          })
          .onConflict('key')
          .merge({ value: JSON.stringify({ expiresAt }) });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  // 12. restartShardGroup — restart a shard group
  app.post(
    '/admin/power-engine/restartShardGroup',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const { shardGroup } = (req.body ?? {}) as { shardGroup?: number };
      const outcome = await deps.dispatcher.dispatch('restartShardGroup', body, async () => {
        await deps.db
          .knex('system_state')
          .insert({
            key: `restart-shard:${shardGroup}`,
            value: JSON.stringify({ requestedAt: new Date().toISOString() }),
          })
          .onConflict('key')
          .merge({ value: JSON.stringify({ requestedAt: new Date().toISOString() }) });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  // 13. triggerCoreRestart — trigger a zero-downtime core restart
  app.post(
    '/admin/power-engine/triggerCoreRestart',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const outcome = await deps.dispatcher.dispatch('triggerCoreRestart', body, async () => {
        await deps.db
          .knex('system_state')
          .insert({
            key: 'core-restart',
            value: JSON.stringify({ requestedAt: new Date().toISOString() }),
          })
          .onConflict('key')
          .merge({ value: JSON.stringify({ requestedAt: new Date().toISOString() }) });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  // 14. rollbackModuleVersion — revert a module to its previous version
  app.post(
    '/admin/power-engine/rollbackModuleVersion',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const { moduleSlug, targetVersion } = (req.body ?? {}) as {
        moduleSlug?: string;
        targetVersion?: string;
      };
      const outcome = await deps.dispatcher.dispatch('rollbackModuleVersion', body, async () => {
        await deps.db
          .knex('system_state')
          .insert({
            key: `rollback:${moduleSlug}`,
            value: JSON.stringify({ targetVersion, requestedAt: new Date().toISOString() }),
          })
          .onConflict('key')
          .merge({
            value: JSON.stringify({ targetVersion, requestedAt: new Date().toISOString() }),
          });
      });
      return sendDispatchResult(reply, outcome);
    },
  );

  // 16. queryAuditLog — query the audit log
  app.get('/admin/power-engine/queryAuditLog', async (req: FastifyRequest, reply: FastifyReply) => {
    const { source, actorId, targetType, targetId, limit } = (req.query ?? {}) as {
      source?: string;
      actorId?: string;
      targetType?: string;
      targetId?: string;
      limit?: string;
    };
    const query = deps.db.knex('audit_logs').orderBy('timestamp', 'desc');
    if (source) query.where({ source });
    if (actorId) query.where({ actorId });
    if (targetType) query.where({ targetType });
    if (targetId) query.where({ targetId });
    query.limit(Math.min(parseInt(limit ?? '50', 10), 200));
    const rows = await query;
    return reply.code(200).send(rows);
  });

  // 17. revokeModuleSignature — revoke a module's signing key
  app.post(
    '/admin/power-engine/revokeModuleSignature',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const body = extractRequest(req.body);
      const { moduleSlug } = (req.body ?? {}) as { moduleSlug?: string };
      const outcome = await deps.dispatcher.dispatch('revokeModuleSignature', body, async () => {
        await deps.db
          .knex('signing_keys')
          .where({ moduleSlug })
          .update({ revokedAt: new Date(), updatedAt: new Date() });
      });
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
      const body = extractRequest(req.body);
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
      const body = extractRequest(req.body);
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
