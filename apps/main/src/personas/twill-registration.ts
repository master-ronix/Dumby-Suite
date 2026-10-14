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
  const boundGuildId = str(body.boundGuildId);
  if (boundGuildId === undefined) return { ok: false, reason: 'boundGuildId is required' };
  const botToken = str(body.botToken);
  if (botToken === undefined) return { ok: false, reason: 'botToken is required' };
  const registrarAuthority = str(body.registrarAuthority);
  if (registrarAuthority === undefined) {
    return { ok: false, reason: 'registrarAuthority is required' };
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
      const discordApplicationId = str(request.body?.discordApplicationId) ?? '';
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
        return reply.code(200).send(publicPersonaView(persona));
      } catch (err) {
        logger.warn(`twill-update-failed: ${reasonOf(err)}`);
        return reply
          .code(statusFor(err))
          .send({ error: 'Update failed', reason: reasonOf(err) });
      }
    },
  );

  /**
   * Revoke a persona: retired and soft-deleted, its bindings released. Its application id becomes
   * free to register again, which is the difference between "revoked" and "temporarily switched off".
   */
  app.delete<{ Params: { personaId: string } }>(
    '/twill/personas/:personaId',
    async (request, reply) => {
      try {
        await service.revokePersona(request.params.personaId);
        return reply.code(204).send();
      } catch (err) {
        logger.warn(`twill-revoke-failed: ${reasonOf(err)}`);
        return reply
          .code(statusFor(err))
          .send({ error: 'Revoke failed', reason: reasonOf(err) });
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
                  secret === undefined
                    ? null
                    : sealPersonaOAuthClientSecret(secret, rootKey),
              }
            : {}),
        });
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
