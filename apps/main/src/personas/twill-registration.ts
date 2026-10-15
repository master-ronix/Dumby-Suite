/**
 * UR-20261012-033 — the Twill persona registration API.
 *
 * ADR-011 makes the registration API the ONLY persona-creation surface, and ADR-003 requires the two
 * credentials a persona carries (its bot token, and the OAuth2 client secret Route A needs) to be
 * stored envelope-encrypted because the process must read them back. This module is that surface: it
 * parses a registration body, seals the credentials, and hands the input to the persona service.
 *
 * The entrypoint (`entry/twill.ts`) only wires this to a database and a listener, so the parsing and
 * the response shapes stay unit-testable without a process.
 */
import type { FastifyInstance } from 'fastify';
import type { EnvelopeRootKey, SealedEnvelope } from '../crypto/envelope.js';
import type { Logger } from '../logging/logger.js';
import type { PersonaBindingStore, PersonaIdentityStore } from './persona.repository.js';
import type { PersonaRegistrarStore } from './persona-registrar.repository.js';
import { verifyApplicationOwnership } from './application-ownership.js';
import {
  derivePersonaBotTokenDigest,
  freeCharterStatus,
  sealPersonaBotToken,
  sealPersonaOAuthClientSecret,
  type CharterStatus,
  type FreeCharterCostSignals,
  ACCENT_PATTERN,
  PERSONA_PRESENCE_STATUSES,
  isDiscordSnowflake,
  isBotToken,
  isClientSecret,
  applicationIdFromBotToken,
  type PersonaPresenceStatus,
  type PersonaIdentity,
  type PersonaRegistrationInput,
} from './persona.js';
import type { PersonaCommandBindingService } from './persona-command-binding.service.js';

const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** The registration body Twill accepts. */
export interface PersonaRegistrationBody {
  name?: unknown;
  discordApplicationId?: unknown;
  boundGuildId?: unknown;
  botToken?: unknown;
  /** UR-20261012-030 — optional. Without it the persona has no Route A authorization. */
  oauthClientSecret?: unknown;
  registrarAuthority?: unknown;
  dmBehavior?: unknown;
  shardAllocation?: unknown;
  grandfathered?: unknown;
  /** UR-20261012-081 — optional presentation: online/dnd/idle/invisible. */
  presenceStatus?: unknown;
  /** UR-20261012-081 — the status quote shown beside the bot's name. */
  note?: unknown;
  /** UR-20261012-081 — a hex accent, e.g. `#7A5AF8`. */
  accent?: unknown;
}

/** UR-20261012-081 — the body of a credential rotation. At least one of the two is required. */
export interface PersonaCredentialBody {
  botToken?: unknown;
  oauthClientSecret?: unknown;
}

export type PersonaRegistrationParse =
  | { readonly ok: true; readonly input: PersonaRegistrationInput }
  | { readonly ok: false; readonly reason: string };

/**
 * Parses and seals a registration body. The credentials are sealed here — never carried in the clear
 * past this boundary, and never echoed back.
 */
export function parsePersonaRegistration(
  body: PersonaRegistrationBody,
  rootKey: EnvelopeRootKey,
): PersonaRegistrationParse {
  const name = str(body.name);
  if (name === undefined) return { ok: false, reason: 'name is required' };
  const discordApplicationId = str(body.discordApplicationId);
  if (discordApplicationId === undefined) {
    return { ok: false, reason: 'discordApplicationId is required' };
  }
  // UR-20261012-089 — a Discord application id IS a snowflake. A username, a name or a truncated id
  // would otherwise be stored and only fail much later, at the OAuth leg or the command deploy.
  if (!isDiscordSnowflake(discordApplicationId)) {
    return {
      ok: false,
      reason:
        'discordApplicationId must be a Discord application id (17-20 digits) — from the Developer Portal, not the application name',
    };
  }
  const boundGuildId = str(body.boundGuildId);
  if (boundGuildId === undefined) return { ok: false, reason: 'boundGuildId is required' };
  if (!isDiscordSnowflake(boundGuildId)) {
    return {
      ok: false,
      reason:
        'boundGuildId must be a Discord server id (17-20 digits) — enable Developer Mode and Copy Server ID',
    };
  }
  const botToken = str(body.botToken);
  if (botToken === undefined) return { ok: false, reason: 'botToken is required' };
  if (!isBotToken(botToken)) {
    return {
      ok: false,
      reason:
        'botToken is not a Discord bot token — expected three dot-separated segments (from Bot → Reset Token)',
    };
  }
  // UR-20261012-089 — the ASSOCIATED application. A token is minted FOR one application, and its first
  // segment carries that application's id, so a token paired with the wrong application is caught here
  // rather than at login.
  const tokenApplicationId = applicationIdFromBotToken(botToken);
  if (tokenApplicationId !== undefined && tokenApplicationId !== discordApplicationId) {
    return {
      ok: false,
      reason: `botToken belongs to application ${tokenApplicationId}, not the discordApplicationId given (${discordApplicationId}) — they must be the same application`,
    };
  }
  const registrarAuthority = str(body.registrarAuthority);
  if (registrarAuthority === undefined) {
    return { ok: false, reason: 'registrarAuthority is required' };
  }
  // UR-20261012-089 — the registrar is identified by their Discord USER id, not a username. A username
  // is mutable and not unique across time; an id is neither.
  if (!isDiscordSnowflake(registrarAuthority)) {
    return {
      ok: false,
      reason:
        'registrarAuthority must be the registrar’s Discord USER id (17-20 digits) — enable Developer Mode and Copy User ID, not a username',
    };
  }
  // UR-20261012-081 — the optional presentation, validated by NAME so a bad value is actionable.
  let presenceStatus: PersonaPresenceStatus | undefined;
  if (body.presenceStatus !== undefined) {
    if (!PERSONA_PRESENCE_STATUSES.includes(body.presenceStatus as PersonaPresenceStatus)) {
      return {
        ok: false,
        reason: `presenceStatus must be one of ${PERSONA_PRESENCE_STATUSES.join(', ')}`,
      };
    }
    presenceStatus = body.presenceStatus as PersonaPresenceStatus;
  }
  const note = str(body.note);
  if (note !== undefined && note.length > 128) {
    return { ok: false, reason: 'note must be 128 characters or fewer' };
  }
  const accent = str(body.accent);
  if (accent !== undefined && !ACCENT_PATTERN.test(accent)) {
    return { ok: false, reason: 'accent must be a hex colour like #7A5AF8 or #7AF' };
  }

  const secret = str(body.oauthClientSecret);
  if (secret !== undefined && !isClientSecret(secret)) {
    return {
      ok: false,
      reason: 'oauthClientSecret is not a Discord client secret — from OAuth2 → Reset Secret',
    };
  }
  let oauthClientSecretSealed: SealedEnvelope | undefined;
  if (secret !== undefined) oauthClientSecretSealed = sealPersonaOAuthClientSecret(secret, rootKey);

  return {
    ok: true,
    input: {
      name,
      discordApplicationId,
      boundGuildId,
      botTokenDigest: derivePersonaBotTokenDigest(botToken),
      botTokenSealed: sealPersonaBotToken(botToken, rootKey),
      ...(oauthClientSecretSealed !== undefined ? { oauthClientSecretSealed } : {}),
      registrarAuthority,
      dmBehavior: body.dmBehavior === 'allowed' ? 'allowed' : 'prohibited',
      ...(typeof body.shardAllocation === 'number'
        ? { shardAllocation: body.shardAllocation }
        : {}),
      grandfathered: body.grandfathered === true,
      ...(presenceStatus !== undefined ? { presenceStatus } : {}),
      ...(note !== undefined ? { note } : {}),
      ...(accent !== undefined ? { accent } : {}),
    },
  };
}

/** A persona as the API may disclose it: identity only, never a sealed credential or its digest. */
export function publicPersonaView(persona: PersonaIdentity): Record<string, unknown> {
  return {
    id: persona.id,
    name: persona.name,
    discordApplicationId: persona.discordApplicationId,
    boundGuildId: persona.boundGuildId,
    dmBehavior: persona.dmBehavior,
    shardAllocation: persona.shardAllocation,
    charter: persona.charter,
    grandfathered: persona.grandfathered,
    status: persona.status,
    // UR-20261012-081 — presentation, as configured. Absent rather than null, so "not configured"
    // reads as absent on the wire.
    ...(persona.presenceStatus !== undefined ? { presenceStatus: persona.presenceStatus } : {}),
    ...(persona.note !== undefined ? { note: persona.note } : {}),
    ...(persona.accent !== undefined ? { accent: persona.accent } : {}),
    /** UR-20261012-030 — whether Route A is available for this persona. */
    oauthConfigured: persona.oauthClientSecretSealed !== undefined,
  };
}

export interface TwillPersonaRouteDeps {
  service: PersonaCommandBindingService;
  identities: PersonaIdentityStore;
  bindings: PersonaBindingStore;
  /** UR-20261012-037 — who may register what. Absent, the registrar surface is not served. */
  registrars?: PersonaRegistrarStore | undefined;
  rootKey: EnvelopeRootKey;
  logger: Logger;
  /** ADR-008 — the free-charter cost signals the registration gate reads. */
  costSignals: FreeCharterCostSignals;
  /** Injectable for tests: the fetch used to prove application ownership. */
  ownershipFetch?: typeof fetch | undefined;
  /**
   * UR-20261012-052 — the guild's module enablement, so a binding for a module the guild has turned
   * OFF is refused at the surface. Optional: without it the check is skipped.
   */
  isModuleEnabledInGuild?: (moduleId: string, guildId: string) => Promise<boolean>;
  /**
   * UR-20261012-082 — re-apply a persona's presence to its RUNNING client. Optional: without it an
   * update still writes the column, but the change lands at the next restart.
   */
  applyPersonaPresence?: (
    personaId: string,
    presence: { status: string; note?: string },
  ) => boolean;
  /**
   * UR-20261012-083 — stop a persona's RUNNING client and clear its commands on revoke. Optional:
   * without it a revoked persona keeps serving until the next restart.
   */
  /**
   * UR-20261012-085 — bring a persona online from her CURRENT row, without a process restart. Called
   * after a registration, a binding change and a credential rotation, each of which used to need one.
   */
  reloadPersona?: (persona: {
    id: string;
    name: string;
    discordApplicationId: string;
    boundGuildId: string;
    botTokenSealed: unknown;
    status: string;
  }) => Promise<unknown>;
  stopPersona?: (persona: {
    id: string;
    name: string;
    discordApplicationId: string;
    boundGuildId: string;
    botTokenSealed: unknown;
    status: string;
  }) => Promise<boolean>;
}

/** HTTP status for a registration rejection, by error name. */
function statusFor(err: unknown): number {
  const name = err instanceof Error ? err.name : '';
  if (name === 'ApplicationAlreadyRegisteredError') return 409;
  if (name === 'FreeCharterEndedError') return 409;
  if (name === 'UnknownPersonaError') return 404;
  // UR-20261012-037 — authenticated but not authorised is a 403, not a 400.
  if (name === 'RegistrarNotAuthorisedError') return 403;
  if (name === 'SingleServerBoundViolationError') return 409;
  return 400;
}

function reasonOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Registers the Twill persona surface: creation, the detail/status/charter reads, and the binding
 * pair. Every response carries identity only — a sealed credential is never echoed.
 */
export function registerTwillPersonaRoutes(
  app: FastifyInstance,
  deps: TwillPersonaRouteDeps,
): void {
  const { service, identities, bindings, registrars, rootKey, logger, costSignals } = deps;

  /**
   * UR-20261012-085 — reload a persona so a write takes effect without a restart. Non-fatal: the write
   * already succeeded, and a reload that fails must not turn a successful registration into a 500.
   */
  const reload = async (personaId: string): Promise<void> => {
    if (deps.reloadPersona === undefined) return;
    try {
      const persona = await identities.findById(personaId);
      if (persona === undefined) return;
      await deps.reloadPersona({
        id: persona.id,
        name: persona.name,
        discordApplicationId: persona.discordApplicationId,
        boundGuildId: persona.boundGuildId,
        botTokenSealed: persona.botTokenSealed,
        status: persona.status,
      });
    } catch (err) {
      logger.warn(`twill-reload-failed id=${personaId} reason=${reasonOf(err)}`);
    }
  };

  app.post<{ Body: PersonaRegistrationBody }>(
    '/twill/personas/register',
    async (request, reply) => {
      const parsed = parsePersonaRegistration(request.body ?? {}, rootKey);
      if (!parsed.ok) {
        logger.warn(`twill-register-rejected: ${parsed.reason}`);
        return reply.code(400).send({ error: 'Bad Request', reason: parsed.reason });
      }
      // UR-20261012-041 — prove the applicant HOLDS the application before anything is created.
      // ADR-011/ADR-008: registration is bring-your-own-identity, so the bot token is the proof, and
      // no operator allowlist stands between a guild administrator and their own persona.
      const ownership = await verifyApplicationOwnership({
        botToken: str(request.body?.botToken) ?? '',
        discordApplicationId: parsed.input.discordApplicationId,
        ...(deps.ownershipFetch !== undefined ? { fetchImpl: deps.ownershipFetch } : {}),
      });
      if (!ownership.owned) {
        logger.warn(`twill-register-ownership-refused: ${ownership.reason}`);
        return reply.code(403).send({ error: 'Ownership not proven', reason: ownership.reason });
      }
      try {
        const persona = await service.registerPersona(parsed.input, costSignals);
        // The log viewer drops structured fields, so the outcome is in the message too.
        // The log viewer drops structured fields, so the whole outcome is in the message. The
        // registrar attestation is RECORDED here; it is not verified — there is no registrar
        // registry to check it against. Authentication is the internal API key on this surface.
        logger.info(
          `persona-registered id=${persona.id} guild=${persona.boundGuildId} ` +
            `authority=${parsed.input.registrarAuthority}`,
        );
        // UR-20261012-085 — bring her online NOW. The runtime reads the persona table at boot, so a
        // registration used to need a process restart before she existed to it.
        await reload(persona.id);
        return reply.code(201).send(publicPersonaView(persona));
      } catch (err) {
        logger.warn(`twill-register-failed: ${reasonOf(err)}`);
        return reply
          .code(statusFor(err))
          .send({ error: 'Registration failed', reason: reasonOf(err) });
      }
    },
  );

  // UR-20261012-037 — the registrar registry's runtime surface. Granting is what makes a
  // registration possible; the boot seed covers a fresh install.
  app.get('/twill/registrars', async (_request, reply) => {
    if (registrars === undefined) {
      return reply.code(404).send({ error: 'Not Found', reason: 'no registrar registry' });
    }
    return reply.send({ registrars: await registrars.list() });
  });

  app.post<{ Body: { authority?: unknown; discordApplicationId?: unknown; grantedBy?: unknown } }>(
    '/twill/registrars',
    async (request, reply) => {
      if (registrars === undefined) {
        return reply.code(404).send({ error: 'Not Found', reason: 'no registrar registry' });
      }
      const authority = str(request.body?.authority);
      if (authority === undefined) {
        return reply.code(400).send({ error: 'Bad Request', reason: 'authority is required' });
      }
      // UR-20261012-089 — the registrar is identified by their Discord USER id, not a username.
      if (!isDiscordSnowflake(authority)) {
        return reply.code(400).send({
          error: 'Bad Request',
          reason:
            'authority must be the registrar’s Discord USER id (17-20 digits) — enable Developer Mode and Copy User ID, not a username',
        });
      }
      const discordApplicationId = str(request.body?.discordApplicationId) ?? '';
      // '' is the documented "any application" bootstrap registrar; anything else must be a real id.
      if (discordApplicationId !== '' && !isDiscordSnowflake(discordApplicationId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          reason:
            'discordApplicationId must be a Discord application id (17-20 digits), or empty for any application',
        });
      }
      const grantedBy = str(request.body?.grantedBy) ?? 'internal-api';
      await registrars.grant({ authority, discordApplicationId, grantedBy });
      logger.info(
        `persona-registrar-granted authority=${authority} application=${discordApplicationId || 'ANY'}`,
      );
      return reply.code(201).send({ authority, discordApplicationId, grantedBy });
    },
  );

  app.delete<{ Params: { authority: string; applicationId: string } }>(
    '/twill/registrars/:authority/:applicationId',
    async (request, reply) => {
      if (registrars === undefined) {
        return reply.code(404).send({ error: 'Not Found', reason: 'no registrar registry' });
      }
      const revoked = await registrars.revoke(
        request.params.authority,
        request.params.applicationId,
      );
      if (!revoked) {
        return reply.code(404).send({ error: 'Not Found', reason: 'no such grant' });
      }
      logger.info(
        `persona-registrar-revoked authority=${request.params.authority} application=${request.params.applicationId || 'ANY'}`,
      );
      return reply.code(204).send();
    },
  );

  app.get<{ Params: { personaId: string } }>(
    '/twill/personas/:personaId',
    async (request, reply) => {
      const persona = await identities.findById(request.params.personaId);
      if (persona === undefined) {
        return reply.code(404).send({ error: 'Not Found', reason: 'no such persona' });
      }
      return reply.send(publicPersonaView(persona));
    },
  );

  app.get<{ Params: { personaId: string } }>(
    '/twill/personas/:personaId/status',
    async (request, reply) => {
      const persona = await identities.findById(request.params.personaId);
      if (persona === undefined) {
        return reply.code(404).send({ error: 'Not Found', reason: 'no such persona' });
      }
      // Presence in the bound guild is not resolvable from here — it needs a gateway. The
      // registration status is what this surface owns; the page resolves presence itself.
      return reply.send({
        id: persona.id,
        status: persona.status,
        boundGuildId: persona.boundGuildId,
        oauthConfigured: persona.oauthClientSecretSealed !== undefined,
      });
    },
  );

  app.get<{ Params: { personaId: string } }>(
    '/twill/personas/:personaId/charter',
    async (request, reply) => {
      const persona = await identities.findById(request.params.personaId);
      if (persona === undefined) {
        return reply.code(404).send({ error: 'Not Found', reason: 'no such persona' });
      }
      const charter: CharterStatus = freeCharterStatus(costSignals);
      return reply.send({ ...charter, grandfathered: persona.grandfathered });
    },
  );

  app.post<{
    Params: { personaId: string };
    Body: { guildId?: unknown; moduleSlug?: unknown };
  }>('/twill/personas/:personaId/bindings', async (request, reply) => {
    const guildId = str(request.body?.guildId);
    const moduleSlug = str(request.body?.moduleSlug);
    if (guildId === undefined || moduleSlug === undefined) {
      return reply
        .code(400)
        .send({ error: 'Bad Request', reason: 'guildId and moduleSlug are required' });
    }
    // UR-20261012-089 — a guild id is a snowflake. A name or a truncated id would bind against a guild
    // that does not exist and only surface as a module that never answers.
    if (!isDiscordSnowflake(guildId)) {
      return reply.code(400).send({
        error: 'Bad Request',
        reason:
          'guildId must be a Discord server id (17-20 digits) — enable Developer Mode and Copy Server ID',
      });
    }
    // UR-20261012-052 — refuse a binding for a module the guild has DISABLED.
    //
    // The bind itself does not need the module to be enabled, and neither does the command deploy —
    // so binding a disabled module SUCCEEDS, the command is registered, and then every invocation is
    // refused at dispatch ("not available in guild"). That is a visible-but-dead command, which reads
    // as a broken persona rather than as a module the guild turned off. Failing here, by name, costs
    // the operator one `/browse` step and saves them an hour of debugging.
    if (deps.isModuleEnabledInGuild !== undefined) {
      const enabled = await deps.isModuleEnabledInGuild(moduleSlug, guildId);
      if (!enabled) {
        logger.warn(
          `twill-bind-refused guild=${guildId} module=${moduleSlug} reason=module-not-enabled`,
        );
        return reply.code(409).send({
          error: 'Binding refused',
          reason: `module "${moduleSlug}" is not enabled in guild ${guildId} — enable it first (for a standard module, re-enable it from /browse)`,
        });
      }
    }
    try {
      const binding = await service.bindModuleToPersona({
        guildId,
        moduleSlug,
        personaId: request.params.personaId,
      });
      logger.info(`persona-module-bound guild=${guildId} module=${moduleSlug}`);
      // UR-20261012-085 — her command set is built FROM her bindings, so a new binding is inert until
      // she rebuilds it. Reload her rather than making the operator restart the service.
      await reload(request.params.personaId);
      return reply.code(201).send(binding);
    } catch (err) {
      logger.warn(`twill-bind-failed: ${reasonOf(err)}`);
      return reply.code(statusFor(err)).send({ error: 'Binding failed', reason: reasonOf(err) });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // UR-20261012-081 — the persona MANAGEMENT surface. Registration created a persona; these are the
  // operations that make one liveable: read it, list them, change it, rotate its credentials, revoke
  // it. All behind the same internal API key as the rest of Twill.
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /** Every persona, identity only. A revoked one is gone from here, because it is soft-deleted. */
  app.get('/twill/personas', async (_request, reply) => {
    const all = await identities.list();
    return reply.code(200).send({ personas: all.map(publicPersonaView), count: all.length });
  });

  /**
   * Update a persona. A PATCH carries only what it changes; an absent field is left alone, and an
   * explicit `null` clears a presentation field.
   */
  app.patch<{ Params: { personaId: string }; Body: Record<string, unknown> }>(
    '/twill/personas/:personaId',
    async (request, reply) => {
      const body = request.body ?? {};
      try {
        const persona = await service.updatePersona(request.params.personaId, {
          ...(str(body['name']) !== undefined ? { name: str(body['name']) as string } : {}),
          ...(str(body['dmBehavior']) !== undefined
            ? { dmBehavior: str(body['dmBehavior']) as never }
            : {}),
          ...(typeof body['shardAllocation'] === 'number'
            ? { shardAllocation: body['shardAllocation'] }
            : {}),
          ...('presenceStatus' in body
            ? { presenceStatus: (body['presenceStatus'] ?? null) as never }
            : {}),
          ...('note' in body ? { note: (body['note'] ?? null) as never } : {}),
          ...('accent' in body ? { accent: (body['accent'] ?? null) as never } : {}),
          ...(str(body['status']) !== undefined ? { status: str(body['status']) as never } : {}),
        });
        // UR-20261012-082 — a presence that only lands at the next restart is a field that looks
        // broken. Apply it to the running client now, and say so when there is nothing to apply it
        // to — a persona that is not hosted has not been ignored, it simply is not running.
        const touchesPresence = 'presenceStatus' in body || 'note' in body;
        if (touchesPresence && deps.applyPersonaPresence !== undefined) {
          if (persona.presenceStatus === undefined) {
            logger.info(
              `persona-presence-not-applied id=${persona.id} — no presence configured; left as-is`,
            );
          } else {
            const applied = deps.applyPersonaPresence(persona.id, {
              status: persona.presenceStatus,
              ...(persona.note !== undefined ? { note: persona.note } : {}),
            });
            if (!applied) {
              logger.info(
                `persona-presence-not-applied id=${persona.id} — persona is not currently hosted`,
              );
            }
          }
        }
        return reply.code(200).send(publicPersonaView(persona));
      } catch (err) {
        logger.warn(`twill-update-failed: ${reasonOf(err)}`);
        return reply.code(statusFor(err)).send({ error: 'Update failed', reason: reasonOf(err) });
      }
    },
  );

  /**
   * Revoke a persona: retired and soft-deleted, its bindings released. Its application id becomes
   * free to register again, which is the difference between "revoked" and "temporarily switched off".
   */
  /**
   * UR-20261012-088 — move a persona to a different guild.
   *
   * The persona is single-server-bound, so this is the operation that changes WHICH server. It is not
   * a PATCH field because three things follow from it: her bindings belong to the old guild and are
   * released, her commands are registered against the old guild and are cleared, and the new guild
   * must already be known to the framework.
   *
   * Order matters. She is STOPPED first, while her identity still names the OLD guild, because that is
   * the guild whose commands need clearing — stopping after the move would clear the new guild's, which
   * have not been written yet, and leave the old ones live. Then the row moves, then she is reloaded,
   * which registers her commands in the new guild.
   */
  app.post<{ Params: { personaId: string }; Body: { guildId?: unknown } }>(
    '/twill/personas/:personaId/rebind',
    async (request, reply) => {
      const guildId = str(request.body?.guildId);
      if (guildId === undefined) {
        return reply.code(400).send({ error: 'Bad Request', reason: 'guildId is required' });
      }
      if (!isDiscordSnowflake(guildId)) {
        return reply.code(400).send({
          error: 'Bad Request',
          reason:
            'guildId must be a Discord server id (17-20 digits) — enable Developer Mode and Copy Server ID',
        });
      }
      const persona = await identities.findById(request.params.personaId);
      if (persona === undefined) {
        return reply.code(404).send({
          error: 'Unknown persona',
          reason: `No persona "${request.params.personaId}" exists`,
        });
      }
      if (persona.boundGuildId === guildId) {
        // Idempotent, and said so — an operator re-running this should not have to guess.
        return reply.code(200).send({
          ...publicPersonaView(persona),
          rebind: { from: guildId, to: guildId, changed: false },
        });
      }
      const from = persona.boundGuildId;
      try {
        // Stop her against the OLD guild: this clears the commands registered there and closes her
        // client. Non-fatal by construction inside stopPersona.
        if (deps.stopPersona !== undefined) {
          await deps.stopPersona({
            id: persona.id,
            name: persona.name,
            discordApplicationId: persona.discordApplicationId,
            boundGuildId: from,
            botTokenSealed: persona.botTokenSealed,
            status: persona.status,
          });
        }
        const moved = await service.rebindPersona(persona.id, guildId);
        logger.info(`twill-rebind id=${persona.id} from=${from} to=${guildId}`);
        await reload(persona.id);
        return reply
          .code(200)
          .send({ ...publicPersonaView(moved), rebind: { from, to: guildId, changed: true } });
      } catch (err) {
        logger.warn(`twill-rebind-failed id=${persona.id} reason=${reasonOf(err)}`);
        return reply.code(statusFor(err)).send({ error: 'Rebind failed', reason: reasonOf(err) });
      }
    },
  );

  /**
   * UR-20261012-087 — restart ONE persona, without restarting the service.
   *
   * Reloads her from her CURRENT row: a fresh gateway login, her commands re-deployed from her current
   * bindings, her presence re-applied. The runtime reads all of that once, at boot, so this is the
   * operator's "restart her" — and unlike a process restart it does not blip the main bot.
   *
   * The management surface calls this automatically after a registration, a binding and a credential
   * rotation (UR-20261012-085). This route is for everything else: an out-of-band change to her row, a
   * module's commands changing underneath her, or simply an operator who wants her cycled.
   */
  app.post<{ Params: { personaId: string } }>(
    '/twill/personas/:personaId/reload',
    async (request, reply) => {
      const persona = await identities.findById(request.params.personaId);
      if (persona === undefined) {
        return reply.code(404).send({
          error: 'Unknown persona',
          reason: `No persona "${request.params.personaId}" exists`,
        });
      }
      if (deps.reloadPersona === undefined) {
        // Honest rather than a 200 that did nothing: without the runtime there is nothing to reload.
        return reply.code(501).send({
          error: 'Not configured',
          reason: 'the persona runtime is not enabled on this deployment',
        });
      }
      try {
        const result = await deps.reloadPersona({
          id: persona.id,
          name: persona.name,
          discordApplicationId: persona.discordApplicationId,
          boundGuildId: persona.boundGuildId,
          botTokenSealed: persona.botTokenSealed,
          status: persona.status,
        });
        logger.info(`twill-reload-requested id=${persona.id} result=${JSON.stringify(result)}`);
        // The persona's own view, plus what the reload did — an absent result means her row no longer
        // matched (for example she was revoked), which is information, not an error.
        return reply.code(200).send({ ...publicPersonaView(persona), reload: result ?? null });
      } catch (err) {
        logger.warn(`twill-reload-failed id=${persona.id} reason=${reasonOf(err)}`);
        return reply.code(statusFor(err)).send({ error: 'Reload failed', reason: reasonOf(err) });
      }
    },
  );

  app.delete<{ Params: { personaId: string } }>(
    '/twill/personas/:personaId',
    async (request, reply) => {
      try {
        // Read her BEFORE the revoke: the row is retired by the revoke, and a lookup afterwards
        // would not find her — while her running client and her registered commands still need
        // clearing.
        const persona = await identities.findById(request.params.personaId);
        await service.revokePersona(request.params.personaId);
        // UR-20261012-083 — the revoke is only half of it. Without this she stays ONLINE with every
        // command loaded until the next restart, which reads as the delete having done nothing.
        if (persona !== undefined && deps.stopPersona !== undefined) {
          const stopped = await deps.stopPersona({
            id: persona.id,
            name: persona.name,
            discordApplicationId: persona.discordApplicationId,
            boundGuildId: persona.boundGuildId,
            botTokenSealed: persona.botTokenSealed,
            status: persona.status,
          });
          if (!stopped) {
            logger.info(
              `persona-revoked-not-hosted id=${persona.id} — no running client to stop; ` +
                `her commands were still cleared`,
            );
          }
        }
        return reply.code(204).send();
      } catch (err) {
        logger.warn(`twill-revoke-failed: ${reasonOf(err)}`);
        return reply.code(statusFor(err)).send({ error: 'Revoke failed', reason: reasonOf(err) });
      }
    },
  );

  /**
   * Rotate a persona's credentials. At least one of `botToken` / `oauthClientSecret` is required.
   *
   * Sending `"oauthClientSecret": null` CLEARS it, which drops the persona to the bot-token fallback
   * (Route B). Sending a new one replaces it and invalidates the previous authorization, so the
   * verification is re-earned on the next successful OAuth leg.
   */
  app.post<{ Params: { personaId: string }; Body: PersonaCredentialBody }>(
    '/twill/personas/:personaId/credentials',
    async (request, reply) => {
      const body = request.body ?? {};
      const botToken = str(body.botToken);
      const hasSecretKey = 'oauthClientSecret' in body;
      const secret = str(body.oauthClientSecret);
      if (botToken === undefined && !hasSecretKey) {
        return reply.code(400).send({
          error: 'Bad Request',
          reason: 'at least one of botToken or oauthClientSecret is required',
        });
      }
      if (botToken !== undefined && !isBotToken(botToken)) {
        return reply.code(400).send({
          error: 'Bad Request',
          reason:
            'botToken is not a Discord bot token — expected three dot-separated segments (from Bot → Reset Token)',
        });
      }
      if (secret !== undefined && !isClientSecret(secret)) {
        return reply.code(400).send({
          error: 'Bad Request',
          reason: 'oauthClientSecret is not a Discord client secret — from OAuth2 → Reset Secret',
        });
      }
      // UR-20261012-089 — the rotated token must belong to THIS persona's application, or the next
      // login fails with a mismatch that names neither the token nor the persona.
      if (botToken !== undefined) {
        const held = await identities.findById(request.params.personaId);
        const tokenApplicationId = applicationIdFromBotToken(botToken);
        if (
          held !== undefined &&
          tokenApplicationId !== undefined &&
          tokenApplicationId !== held.discordApplicationId
        ) {
          return reply.code(400).send({
            error: 'Bad Request',
            reason: `botToken belongs to application ${tokenApplicationId}, not this persona's application (${held.discordApplicationId})`,
          });
        }
      }
      try {
        const persona = await service.rotatePersonaCredentials(request.params.personaId, {
          ...(botToken !== undefined
            ? {
                botTokenDigest: derivePersonaBotTokenDigest(botToken),
                botTokenSealed: sealPersonaBotToken(botToken, rootKey),
              }
            : {}),
          ...(hasSecretKey
            ? {
                oauthClientSecretSealed:
                  secret === undefined ? null : sealPersonaOAuthClientSecret(secret, rootKey),
              }
            : {}),
        });
        // UR-20261012-085 — a new token means a new gateway login; reload so it is used now.
        await reload(persona.id);
        return reply.code(200).send(publicPersonaView(persona));
      } catch (err) {
        logger.warn(`twill-credentials-failed: ${reasonOf(err)}`);
        return reply
          .code(statusFor(err))
          .send({ error: 'Credential rotation failed', reason: reasonOf(err) });
      }
    },
  );

  app.delete<{ Params: { personaId: string; moduleSlug: string } }>(
    '/twill/personas/:personaId/bindings/:moduleSlug',
    async (request, reply) => {
      const persona = await identities.findById(request.params.personaId);
      if (persona === undefined) {
        return reply.code(404).send({ error: 'Not Found', reason: 'no such persona' });
      }
      const live = await bindings.findLive(persona.boundGuildId, request.params.moduleSlug);
      if (live === undefined) {
        return reply.code(404).send({ error: 'Not Found', reason: 'no such binding' });
      }
      await service.unbindModule(persona.boundGuildId, request.params.moduleSlug);
      logger.info(
        `persona-module-unbound guild=${persona.boundGuildId} module=${request.params.moduleSlug}`,
      );
      return reply.code(204).send();
    },
  );
}
