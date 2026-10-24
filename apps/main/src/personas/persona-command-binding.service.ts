import {
  toPersonaUpdateColumns,
  type PersonaUpdateInput,
  assertApplicationNotRegistered,
  assertBindingAllowed,
  assertFreeCharterRegistration,
  buildPersonaIdentity,
  type FreeCharterCostSignals,
  type PersonaBinding,
  type PersonaIdentity,
  type PersonaRegistrationInput,
  RegistrarNotAuthorisedError,
  UnknownPersonaError,
} from './persona.js';
import type { PersonaBindingStore, PersonaIdentityStore } from './persona.repository.js';
import type { PersonaRegistrarStore } from './persona-registrar.repository.js';
import type { Knex } from 'knex';
import type { Logger } from '../logging/logger.js';

export class PersonaCommandBindingService {
  constructor(
    private readonly identities: PersonaIdentityStore,
    private readonly bindings: PersonaBindingStore,
    private readonly logger: Logger,
    /**
     * UR-20261012-037 — who may register what. Optional so a caller that has no registry (a unit
     * test, a read-only surface) can still construct the service; when absent, registrations are
     * REFUSED rather than waved through.
     */
    private readonly registrars?: PersonaRegistrarStore,
    /**
     * UR-20261012-078 — whether the guild has the module ENABLED. Needed to answer the ownership
     * question for a module no persona holds: only the main bot enables a module nobody claimed, so
     * an enabled module with no binding IS the main bot's. Optional so a read-only caller can still
     * construct the service; absent, ownership is unanswered rather than guessed.
     */
    private readonly isModuleEnabled?: (guildId: string, moduleSlug: string) => Promise<boolean>,
    /**
     * UR-20261012-080 — a module's tier, so a SHARED one is never reported as a profile's. Optional;
     * absent, the shared tiers are not special-cased here (the callers that matter short-circuit).
     */
    private readonly tierOf?: (
      moduleSlug: string,
    ) => 'admin' | 'core' | 'standard' | 'marketplace' | undefined,
    /**
     * WHO enabled the module in this guild. Optional, and absent for a row written before the column
     * existed — the read then falls back to the binding, and only then to the main.
     */
    private readonly enabledByOf?: (
      guildId: string,
      moduleSlug: string,
    ) => Promise<string | undefined>,
  ) {}

  async registerPersona(
    input: PersonaRegistrationInput,
    costSignals: FreeCharterCostSignals,
  ): Promise<PersonaIdentity> {
    // UR-20261012-041 — the registry is an OPTIONAL allowlist, NOT the gate. ADR-011/ADR-008 make
    // registration bring-your-own-identity, so an EMPTY registry means "no allowlist configured"
    // and registration proceeds; a non-empty one is an operator's deliberate narrowing and is
    // enforced. Ownership of the application is proven separately, at the surface, by the bot token.
    if (this.registrars !== undefined && (await this.registrars.hasAny())) {
      const authorised = await this.registrars.isAuthorised(
        input.registrarAuthority,
        input.discordApplicationId,
      );
      if (!authorised) {
        throw new RegistrarNotAuthorisedError(input.registrarAuthority, input.discordApplicationId);
      }
    }
    const existing = await this.identities.findByApplicationId(input.discordApplicationId);
    assertApplicationNotRegistered(existing);
    assertFreeCharterRegistration(input.grandfathered ?? false, costSignals);
    const persona = buildPersonaIdentity(input);
    await this.identities.create(persona);
    this.logger.info('persona-registered', {
      personaId: persona.id,
      guildId: persona.boundGuildId,
      charter: persona.charter,
    });
    return persona;
  }

  /**
   * UR-20261012-088 — move a persona to a different guild.
   *
   * The persona is single-server-bound, and `boundGuildId` is what that rule is enforced against. It is
   * NOT a presentation field: three things follow from it.
   *
   * - **Her bindings belong to the OLD guild.** `guild_persona_bindings` is keyed by `(guildId,
   *   moduleSlug)`, so rows left behind would keep marking modules occupied in a guild she no longer
   *   serves, and the module could not be installed there by anyone. They are released here.
   * - **Her commands are registered against the OLD guild.** That is the route's half — it stops her
   *   before this runs, which clears them — and the reload afterwards re-deploys to the new guild.
   * - **The target guild must exist.** `persona_identities.boundGuildId` is a foreign key to `guilds`,
   *   so a guild the framework has never seen is refused by the database. That refusal is caught and
   *   reported by name, because "violates foreign key constraint" is not an answer an operator can act
   *   on.
   *
   * Idempotent: moving her to the guild she is already bound to is a no-op, not an error.
   */
  async rebindPersona(id: string, guildId: string): Promise<PersonaIdentity> {
    const persona = await this.identities.findById(id);
    if (persona === undefined) throw new UnknownPersonaError(id);
    if (persona.boundGuildId === guildId) return persona;

    const held = await this.bindings.listForPersona(id);
    for (const binding of held) {
      await this.bindings.unbind(binding.guildId, binding.moduleSlug);
    }

    try {
      await this.identities.update(id, { boundGuildId: guildId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/foreign key|boundguildid_foreign/i.test(message)) {
        throw new Error(
          `Guild "${guildId}" is not known to the framework — the main bot must have seen it before a persona can be bound to it`,
        );
      }
      throw err;
    }

    this.logger.info(
      `persona-rebound id=${id} from=${persona.boundGuildId} to=${guildId} bindings-released=${held.length}`,
    );
    return (await this.identities.findById(id)) ?? persona;
  }

  async bindModuleToPersona(request: {
    readonly guildId: string;
    readonly moduleSlug: string;
    readonly personaId: string;
  }, trx?: Knex.Transaction): Promise<PersonaBinding> {
    const persona = await this.identities.findById(request.personaId);
    if (persona === undefined) throw new UnknownPersonaError(request.personaId);
    const existing = await this.bindings.findLive(request.guildId, request.moduleSlug);
    assertBindingAllowed({
      ...request,
      persona,
      ...(existing !== undefined ? { existingBinding: existing } : {}),
    });
    const binding: PersonaBinding = {
      guildId: request.guildId,
      moduleSlug: request.moduleSlug,
      personaId: request.personaId,
    };
    await this.bindings.bind(binding, trx);
    this.logger.info('persona-module-bound', {
      guildId: request.guildId,
      moduleSlug: request.moduleSlug,
      personaId: request.personaId,
    });
    return binding;
  }

  async unbindModule(
    guildId: string,
    moduleSlug: string,
    trx?: Knex.Transaction,
  ): Promise<void> {
    await this.bindings.unbind(guildId, moduleSlug, trx);
    this.logger.info('persona-module-unbound', { guildId, moduleSlug });
  }

  /**
   * UR-20261012-061 / UR-20261012-078 — the ONE ownership read.
   *
   * A persona binding answers first. Otherwise, a module the guild has ENABLED belongs to the MAIN
   * BOT: the claim branch is persona-only, so only the main bot ever enables a module nobody claimed,
   * and the operator's rule is that such a module "is the property of the main bot only".
   *
   * Before this, an enabled-but-unbound module answered `undefined`, which several callers already
   * papered over with `?? 'main'` — the model was assumed in three places and stated in none. It is
   * stated here once. `'main'` cannot collide with a persona id, which is a UUID.
   */
  async resolveCommandOwner(guildId: string, moduleSlug: string): Promise<string | undefined> {
    // SHARED tiers first. The enablement read answers TRUE for core (it is always enabled), which
    // would otherwise make a core module look like a profile's.
    if (this.tierOf?.(moduleSlug) === 'core' || this.tierOf?.(moduleSlug) === 'admin')
      return 'shared';

    const binding = await this.bindings.findLive(guildId, moduleSlug);
    const enabled =
      this.isModuleEnabled === undefined
        ? undefined
        : await this.isModuleEnabled(guildId, moduleSlug).catch((err: unknown) => {
            this.logger.warn('resolve-command-owner-enabled-read-failed', {
              guildId,
              moduleSlug,
              error: String(err),
            });
            return undefined;
          });
    // A module the guild has DISABLED is held by nobody, whatever a binding says.
    if (enabled === false) return undefined;
    // ENABLED — and now the question is WHO enabled it. The state records the enabling profile, so
    // "the main's install" and "a persona's install" are told apart instead of assumed. Before this,
    // a persona's install wrote the enabled state and the read answered 'main', so the module she had
    // just installed appeared under the main's profile.
    if (this.enabledByOf !== undefined) {
      try {
        const enabler = await this.enabledByOf(guildId, moduleSlug);
        if (enabler !== undefined) return enabler;
      } catch (err) {
        this.logger.warn('resolve-command-owner-enabled-by-read-failed', {
          guildId,
          moduleSlug,
          error: String(err),
        });
      }
    }
    // No enabler recorded — a row written before the column existed. The binding answers for it, and
    // failing that, an enabled module nobody claimed is the main bot's.
    if (binding !== undefined) {
      // A claim lasts only while the module is INSTALLED for that persona.
      //
      // It used to be permanent: she could disable the module and the binding survived, so the claim
      // did too. The other profile's install was then refused as "occupied" forever, and — once the
      // deployer began honouring ownership — NEITHER profile registered the command, because the
      // claimant no longer had it installed and the other could not claim it. Reading the enablement
      // makes the claim follow the install, which is what "owned" has to mean.
      if (this.isModuleEnabled === undefined) return binding.personaId;
      try {
        if (await this.isModuleEnabled(guildId, moduleSlug)) return binding.personaId;
      } catch (err) {
        // A failed read must not silently hand the module to the other profile: keep the claim, and
        // say why. The alternative is two profiles believing they own one module.
        this.logger.warn('resolve-command-owner-binding-enabled-read-failed', {
          guildId,
          moduleSlug,
          error: String(err),
        });
        return binding.personaId;
      }
    }
    if (binding !== undefined) return binding.personaId;
    return enabled === true ? 'main' : undefined;
  }

  /**
   * UR-20261012-081 — update a persona's mutable facts. Only the keys present are written, and the
   * validation is `toPersonaUpdateColumns` so every caller shares it.
   */
  async updatePersona(id: string, patch: PersonaUpdateInput): Promise<PersonaIdentity> {
    const persona = await this.identities.findById(id);
    if (persona === undefined) throw new UnknownPersonaError(id);
    const columns = toPersonaUpdateColumns(patch);
    if (Object.keys(columns).length > 0) {
      await this.identities.update(id, columns);
      this.logger.info(
        `persona-updated id=${id} guild=${persona.boundGuildId} fields=${Object.keys(columns).join(',')}`,
      );
    }
    return (await this.identities.findById(id)) ?? persona;
  }

  /**
   * UR-20261012-081 — revoke a persona: retired AND soft-deleted, so no read returns it and its
   * application id is free to be registered again.
   *
   * Its bindings are released first. A revoked persona that still held a module would leave the module
   * uninstallable by anyone — occupied by a profile that no longer exists.
   */
  async revokePersona(id: string): Promise<void> {
    const persona = await this.identities.findById(id);
    if (persona === undefined) throw new UnknownPersonaError(id);
    const held = await this.bindings.listForPersona(id);
    for (const binding of held) {
      await this.bindings.unbind(binding.guildId, binding.moduleSlug);
    }
    await this.identities.revoke(id);
    this.logger.info(
      `persona-revoked id=${id} guild=${persona.boundGuildId} bindings-released=${held.length}`,
    );
  }

  /**
   * UR-20261012-081 — replace a credential. The sealing happens at the surface, which holds the root
   * key; this takes the sealed envelope so the service never sees a plaintext credential.
   *
   * `botToken` and `oauthClientSecret` are independent: supplying one leaves the other alone, and
   * supplying `oauthClientSecret: null` clears it (Route B then applies). Rotating the bot token also
   * invalidates the OAuth verification, because the application may no longer be the same one.
   */
  async rotatePersonaCredentials(
    id: string,
    input: {
      readonly botTokenDigest?: string;
      readonly botTokenSealed?: unknown;
      readonly oauthClientSecretSealed?: unknown | null;
    },
  ): Promise<PersonaIdentity> {
    const persona = await this.identities.findById(id);
    if (persona === undefined) throw new UnknownPersonaError(id);
    if (input.botTokenDigest !== undefined && input.botTokenSealed !== undefined) {
      await this.identities.rotateBotToken(id, input.botTokenDigest, input.botTokenSealed);
    }
    if (input.oauthClientSecretSealed !== undefined) {
      await this.identities.rotateOauthSecret(
        id,
        input.oauthClientSecretSealed === null ? undefined : input.oauthClientSecretSealed,
      );
    }
    // Never log the credential or its value — only that the rotation happened, and which.
    const rotated = [
      ...(input.botTokenSealed !== undefined ? ['botToken'] : []),
      ...(input.oauthClientSecretSealed !== undefined ? ['oauthClientSecret'] : []),
    ];
    this.logger.info(`persona-credentials-rotated id=${id} rotated=${rotated.join(',')}`);
    return (await this.identities.findById(id)) ?? persona;
  }

  async commandsForGuild(guildId: string): Promise<readonly PersonaBinding[]> {
    return this.bindings.listForGuild(guildId);
  }
}
