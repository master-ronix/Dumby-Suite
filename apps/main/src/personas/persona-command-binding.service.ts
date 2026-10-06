/**
 * PersonaCommandBindingService (blueprint §18.5.1, §35.3). Resolves which
 * identity — main bot or a named persona — registers and dispatches a module's
 * command key for a guild, and enforces the binding gates: the
 * single-server-bound invariant and the "occupied by another persona" refusal.
 *
 * Wired at bootstrap Stage 09 alongside the persona stores (never zero-caller);
 * identity loading happens per persona process against its own PERSONA_ID.
 */
import {
  assertApplicationNotRegistered,
  assertBindingAllowed,
  assertFreeCharterRegistration,
  buildPersonaIdentity,
  type FreeCharterCostSignals,
  type PersonaBinding,
  type PersonaIdentity,
  type PersonaRegistrationInput,
  UnknownPersonaError,
} from './persona.js';
import type { PersonaBindingStore, PersonaIdentityStore } from './persona.repository.js';
import type { Logger } from '../logging/logger.js';

export class PersonaCommandBindingService {
  constructor(
    private readonly identities: PersonaIdentityStore,
    private readonly bindings: PersonaBindingStore,
    private readonly logger: Logger,
  ) {}

  /**
   * The Twixter registration API's domain step (ADR-011): validates the
   * registrar's authority over an application the guild owns, records the
   * persona bound to that one guild, and applies the free-charter sunset gate.
   * Infrastructure provisioning (secrets, process, quota) is reserved to
   * process owners and, in v5.0, the stub boundary records it rather than
   * doing it.
   */
  async registerPersona(
    input: PersonaRegistrationInput,
    costSignals: FreeCharterCostSignals,
  ): Promise<PersonaIdentity> {
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

  /** Binds one module in one guild to a persona; "occupied" is refused. */
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

  /** Explicit unbind releases the lock for a new bind to claim (§35.3). */
  async unbindModule(guildId: string, moduleSlug: string): Promise<void> {
    await this.bindings.unbind(guildId, moduleSlug);
    this.logger.info('persona-module-unbound', { guildId, moduleSlug });
  }

  /**
   * The dispatch-time gate (ADR-011): the identity that owns a command key in
   * a guild, resolved per interaction. Undefined means the main bot default.
   */
  async resolveCommandOwner(guildId: string, moduleSlug: string): Promise<string | undefined> {
    const binding = await this.bindings.findLive(guildId, moduleSlug);
    return binding?.personaId;
  }

  /** Full binding resolution for a guild (interface.md §7.3 listing source). */
  async commandsForGuild(guildId: string): Promise<readonly PersonaBinding[]> {
    return this.bindings.listForGuild(guildId);
  }
}
