import type { Logger } from '../logging/logger.js';
import type { GuildSuspensionStore } from '../governance/guild-suspension.js';

/**
 * blueprint.md §22.6 — Power Engine exposes its capabilities as a **catalog** of callable
 * functions; each entry carries a name, a typed parameter schema and a description, and "the
 * identical schema format serves both the Power Engine REST API and the CLAI terminal". The
 * catalog spans 17 control domains (Table 22-A's four original suspend primitives plus thirteen
 * extended domains).
 *
 * Before this file the dispatcher had no catalog at all: both surfaces injected a handler that
 * always threw, so no function could ever do anything. The catalog is what makes the surface real
 * — and what lets a declared-but-unimplemented function fail *honestly* (its invocation is
 * audited as `failed` rather than pretending to succeed).
 */

export type PowerEngineParamType = 'string' | 'number' | 'boolean';

export interface PowerEngineParam {
  readonly name: string;
  readonly type: PowerEngineParamType;
  readonly required: boolean;
  readonly description: string;
}

export interface PowerEngineContext {
  readonly actorId: string;
  readonly source: string;
  readonly reason: string;
  /** §22.7 — joins the caller's audit row to the handler's row. */
  readonly correlationId: string;
  readonly now: () => number;
}

export interface PowerEngineFunctionResult {
  /** Human-readable outcome, rendered by CLAI (a table row) or returned by the REST surface. */
  readonly summary: string;
  readonly data?: Record<string, unknown>;
}

export interface PowerEngineFunction {
  readonly name: string;
  readonly description: string;
  readonly params: readonly PowerEngineParam[];
  /** blueprint.md §22.6 — `suspendGuild` is one of the two functions requiring confirmation. */
  readonly requiresConfirmation?: boolean;
  handler(
    args: Record<string, unknown>,
    ctx: PowerEngineContext,
  ): Promise<PowerEngineFunctionResult>;
}

/** A function the catalog declares but has no backing primitive for — audited as `failed`. */
export class PowerEngineFunctionNotImplementedError extends Error {
  constructor(functionName: string) {
    super(`Power Engine action "${functionName}" has no backing primitive implemented yet`);
    this.name = 'PowerEngineFunctionNotImplementedError';
  }
}

/** The arguments did not satisfy the function's declared parameter schema. */
export class PowerEngineParamError extends Error {
  constructor(functionName: string, detail: string) {
    super(`Power Engine action "${functionName}" received invalid arguments: ${detail}`);
    this.name = 'PowerEngineParamError';
  }
}

const param = (
  name: string,
  type: PowerEngineParamType,
  required: boolean,
  description: string,
): PowerEngineParam => ({ name, type, required, description });

const notImplemented = (name: string): PowerEngineFunction => ({
  name,
  description: `Declared control domain "${name}" — no backing primitive implemented yet.`,
  params: [],
  handler: async () => {
    throw new PowerEngineFunctionNotImplementedError(name);
  },
});

export interface PowerEngineCatalogDeps {
  readonly guildSuspensions: GuildSuspensionStore;
  readonly logger: Logger;
}

function readString(
  fnName: string,
  args: Record<string, unknown>,
  key: string,
  required: boolean,
): string {
  const value = args[key];
  if (value === undefined || value === null) {
    if (required) throw new PowerEngineParamError(fnName, `"${key}" is required`);
    return '';
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PowerEngineParamError(fnName, `"${key}" must be a non-empty string`);
  }
  return value;
}

/**
 * Builds the catalog. The four original suspend primitives (Table 22-A) are declared; `suspendGuild`
 * and `unsuspendGuild` are implemented, the rest throw `PowerEngineFunctionNotImplementedError` so
 * their invocations audit honestly rather than lying.
 */
export function createPowerEngineCatalog(
  deps: PowerEngineCatalogDeps,
): Map<string, PowerEngineFunction> {
  const suspendGuild: PowerEngineFunction = {
    name: 'suspendGuild',
    description:
      'Immediately blocks the bot from responding to ANY interaction originating in the named ' +
      "guild, fleet-wide, regardless of that guild's own configuration.",
    params: [
      param('guildId', 'string', true, 'The Discord guild snowflake to suspend.'),
      param(
        'reason',
        'string',
        true,
        'Why the guild is being suspended (recorded in the audit log).',
      ),
      param('confirm', 'boolean', true, 'Confirmation flag — §22.6 requires it for this action.'),
    ],
    requiresConfirmation: true,
    handler: async (args, ctx) => {
      const guildId = readString('suspendGuild', args, 'guildId', true);
      const reason = readString('suspendGuild', args, 'reason', true);
      if (args['confirm'] !== true) {
        throw new PowerEngineParamError('suspendGuild', '"confirm" must be true');
      }
      await deps.guildSuspensions.suspend({
        guildId,
        suspendedBy: ctx.actorId,
        reason,
        suspendedAt: ctx.now(),
      });
      deps.logger.warn('guild-suspended', { guildId, actorId: ctx.actorId, source: ctx.source });
      return { summary: `guild ${guildId} suspended`, data: { guildId } };
    },
  };

  const unsuspendGuild: PowerEngineFunction = {
    name: 'unsuspendGuild',
    description: 'Lifts a guild suspension, restoring normal dispatch in that guild.',
    params: [
      param('guildId', 'string', true, 'The Discord guild snowflake to restore.'),
      param('reason', 'string', true, 'Why the suspension is being lifted.'),
    ],
    handler: async (args, ctx) => {
      const guildId = readString('unsuspendGuild', args, 'guildId', true);
      const reason = readString('unsuspendGuild', args, 'reason', true);
      const existed = await deps.guildSuspensions.unsuspend(guildId);
      if (!existed) {
        throw new PowerEngineParamError('unsuspendGuild', `guild ${guildId} is not suspended`);
      }
      deps.logger.warn('guild-unsuspended', {
        guildId,
        actorId: ctx.actorId,
        source: ctx.source,
        reason,
      });
      return { summary: `guild ${guildId} unsuspended`, data: { guildId } };
    },
  };

  const listSuspendedGuilds: PowerEngineFunction = {
    name: 'listSuspendedGuilds',
    description: 'Lists every currently suspended guild, for the operator audit surface.',
    params: [],
    handler: async () => {
      const records = await deps.guildSuspensions.list();
      return {
        summary: `${records.length} suspended guild(s)`,
        data: { guilds: records.map((r) => r.guildId) },
      };
    },
  };

  const catalog = new Map<string, PowerEngineFunction>();
  for (const fn of [
    suspendGuild,
    unsuspendGuild,
    listSuspendedGuilds,
    // Table 22-A's remaining original primitives — declared, honestly unimplemented.
    notImplemented('suspendModule'),
    notImplemented('suspendDeveloper'),
    notImplemented('suspendCommand'),
    // Table 22-B's extended domains — declared, honestly unimplemented.
    notImplemented('enterMaintenanceMode'),
    notImplemented('exitMaintenanceMode'),
    notImplemented('flushCacheNamespace'),
    notImplemented('pauseQueue'),
    notImplemented('resumeQueue'),
    notImplemented('requeueDeadLetter'),
    notImplemented('overrideRateLimit'),
    notImplemented('restartShardGroup'),
    notImplemented('triggerCoreRestart'),
    notImplemented('rollbackModuleVersion'),
    notImplemented('suspendPersona'),
    notImplemented('queryAuditLog'),
    notImplemented('revokeModuleSignature'),
  ]) {
    catalog.set(fn.name, fn);
  }
  return catalog;
}
