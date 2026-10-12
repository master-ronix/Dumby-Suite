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
  ) {}

  async registerPersona(
    input: PersonaRegistrationInput,
    costSignals: FreeCharterCostSignals,
  ): Promise<PersonaIdentity> {
    // UR-20261012-037 — authorisation first: the internal API key proves the CALLER is trusted;
    // this proves the caller may register THIS application.
    const authorised =
      this.registrars === undefined
        ? false
        : await this.registrars.isAuthorised(input.registrarAuthority, input.discordApplicationId);
    if (!authorised) {
      throw new RegistrarNotAuthorisedError(input.registrarAuthority, input.discordApplicationId);
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

  async resolveCommandOwner(guildId: string, moduleSlug: string): Promise<string | undefined> {
    const binding = await this.bindings.findLive(guildId, moduleSlug);
    return binding?.personaId;
  }

  async commandsForGuild(guildId: string): Promise<readonly PersonaBinding[]> {
    return this.bindings.listForGuild(guildId);
  }
}
