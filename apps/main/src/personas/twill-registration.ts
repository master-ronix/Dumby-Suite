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
import {
  derivePersonaBotTokenDigest,
  freeCharterStatus,
  sealPersonaBotToken,
  sealPersonaOAuthClientSecret,
  type CharterStatus,
  type FreeCharterCostSignals,
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
    /** UR-20261012-030 — whether Route A is available for this persona. */
    oauthConfigured: persona.oauthClientSecretSealed !== undefined,
  };
}

export interface TwillPersonaRouteDeps {
  service: PersonaCommandBindingService;
  identities: PersonaIdentityStore;
  bindings: PersonaBindingStore;
  rootKey: EnvelopeRootKey;
  logger: Logger;
  /** ADR-008 — the free-charter cost signals the registration gate reads. */
  costSignals: FreeCharterCostSignals;
}

/** HTTP status for a registration rejection, by error name. */
function statusFor(err: unknown): number {
  const name = err instanceof Error ? err.name : '';
  if (name === 'ApplicationAlreadyRegisteredError') return 409;
  if (name === 'FreeCharterEndedError') return 409;
  if (name === 'UnknownPersonaError') return 404;
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
  const { service, identities, bindings, rootKey, logger, costSignals } = deps;

  app.post<{ Body: PersonaRegistrationBody }>(
    '/twill/personas/register',
    async (request, reply) => {
      const parsed = parsePersonaRegistration(request.body ?? {}, rootKey);
      if (!parsed.ok) {
        logger.warn(`twill-register-rejected: ${parsed.reason}`);
        return reply.code(400).send({ error: 'Bad Request', reason: parsed.reason });
      }
      try {
        const persona = await service.registerPersona(parsed.input, costSignals);
        // The log viewer drops structured fields, so the outcome is in the message too.
        logger.info(`persona-registered id=${persona.id} guild=${persona.boundGuildId}`);
        return reply.code(201).send(publicPersonaView(persona));
      } catch (err) {
        logger.warn(`twill-register-failed: ${reasonOf(err)}`);
        return reply
          .code(statusFor(err))
          .send({ error: 'Registration failed', reason: reasonOf(err) });
      }
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
