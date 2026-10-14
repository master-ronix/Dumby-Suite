import {
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

  async bindModuleToPersona(request: {
    readonly guildId: string;
    readonly moduleSlug: string;
    readonly personaId: string;
  }): Promise<PersonaBinding> {
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
    await this.bindings.bind(binding);
    this.logger.info('persona-module-bound', {
      guildId: request.guildId,
      moduleSlug: request.moduleSlug,
      personaId: request.personaId,
    });
    return binding;
  }

  async unbindModule(guildId: string, moduleSlug: string): Promise<void> {
    await this.bindings.unbind(guildId, moduleSlug);
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
    const binding = await this.bindings.findLive(guildId, moduleSlug);
    if (binding !== undefined) return binding.personaId;
    // UR-20261012-080 — a SHARED tier is owned by nobody. The enablement read answers TRUE for core
    // (it is always enabled), which would otherwise make core modules look like the main bot's.
    if (this.tierOf?.(moduleSlug) === 'core' || this.tierOf?.(moduleSlug) === 'admin')
      return 'shared';
    if (this.isModuleEnabled === undefined) return undefined;
    try {
      return (await this.isModuleEnabled(guildId, moduleSlug)) ? 'main' : undefined;
    } catch (err) {
      this.logger.warn('resolve-command-owner-enabled-read-failed', {
        guildId,
        moduleSlug,
        error: String(err),
      });
      return undefined;
    }
  }

  async commandsForGuild(guildId: string): Promise<readonly PersonaBinding[]> {
    return this.bindings.listForGuild(guildId);
  }
}
