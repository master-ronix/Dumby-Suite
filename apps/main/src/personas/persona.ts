/**
 * Twixter Persona domain core (blueprint §35; ADR-008; ADR-011).
 *
 * A Persona is a bring-your-own-identity Discord Application: the guild
 * administrator supplies its token and application, Dumby hosts the instance,
 * and one Persona serves exactly one guild (single-server-bound). Persona
 * creation runs through the Twixter registration API (ADR-011) — never a
 * Discord command — and a running Persona is the identical framework bound to
 * the commissioning guild's token (§35.2).
 *
 * This module is the pure, dependency-free core the M7 done-gate names: the
 * model plus the three enforceable rules — the single-server invariant, the
 * "occupied by another persona" binding/dispatch gate, and the free-charter
 * sunset (ADR-008). Everything here is a pure function or a plain class so
 * the rules are provable by the unit suite without a database.
 */

export const DM_BEHAVIORS = ['prohibited', 'allowed'] as const;
export type PersonaDmBehavior = (typeof DM_BEHAVIORS)[number];

export const PERSONA_STATUSES = ['active', 'retired'] as const;
export type PersonaStatus = (typeof PERSONA_STATUSES)[number];

/** The only charter v5.0 specifies — the free default (blueprint §35.6). */
export const PERSONA_CHARTERS = ['free'] as const;
export type PersonaCharterKind = (typeof PERSONA_CHARTERS)[number];

/** ADR-008 records the sunset condition verbatim for the downloadable surface. */
export const FREE_CHARTER_SUNSET_CONDITION =
  'Personas run free until sunset: the free default ends when Persona fleet ' +
  'capacity requires dedicated infrastructure beyond the shared deployment, or ' +
  'when any per-Persona cost line becomes measurable in the host accounting — ' +
  'whichever comes first. Existing single-server-bound personas are honored ' +
  'under a grandfathering decision made openly at that point.';

export interface PersonaIdentity {
  readonly id: string;
  readonly name: string;
  /** The distinct Discord Application the guild administrator already owns. */
  readonly discordApplicationId: string;
  /** One persona = one server: the commissioning guild, fixed at registration. */
  readonly boundGuildId: string;
  /** The main bot is prohibited; the Twixter instance decides its own. */
  readonly dmBehavior: PersonaDmBehavior;
  readonly shardAllocation: number;
  readonly charter: PersonaCharterKind;
  /** ADR-008 grandfathering flag for personas hosted before the sunset took effect. */
  readonly grandfathered: boolean;
  readonly status: PersonaStatus;
  /**
   * Argon2id digest of the supplied bot token. The plaintext token is never
   * stored — identical discipline to every other credential (§32.1). Full
   * envelope encryption at rest is M8; even at this stub level no plaintext
   * token is ever persisted.
   */
  readonly botTokenDigest: string;
}

/** Bring-your-own-identity registration input (ADR-011 registration API). */
export interface PersonaRegistrationInput {
  readonly name: string;
  readonly discordApplicationId: string;
  readonly boundGuildId: string;
  readonly botTokenDigest: string;
  /** Out-of-band proof the registrar holds authority over the application. */
  readonly registrarAuthority: string;
  readonly dmBehavior?: PersonaDmBehavior;
  readonly shardAllocation?: number;
  readonly grandfathered?: boolean;
}

/**
 * A persona binding names one module in one guild and which identity registers
 * and dispatches it (§35.3). Keyed `(guildId, moduleSlug)`; exactly one live
 * binding per pair.
 */
export interface PersonaBinding {
  readonly guildId: string;
  readonly moduleSlug: string;
  readonly personaId: string;
}

/** The cost signals ADR-008 / §35.6 define as ending the free default. */
export interface FreeCharterCostSignals {
  readonly dedicatedInfrastructureRequired: boolean;
  readonly perPersonaCostMeasurable: boolean;
}

export interface CharterStatus {
  readonly charter: PersonaCharterKind;
  readonly sunsetEffective: boolean;
  readonly condition: string;
}

export class PersonaOccupiedError extends Error {
  constructor(
    readonly guildId: string,
    readonly moduleSlug: string,
    readonly personaId: string,
  ) {
    super(
      `Command key "${moduleSlug}" in guild "${guildId}" is occupied by another persona ` +
        `(guildId, moduleSlug pair already bound to persona "${personaId}")`,
    );
    this.name = 'PersonaOccupiedError';
  }
}

export class SingleServerBoundViolationError extends Error {
  constructor(
    readonly personaId: string,
    readonly boundGuildId: string,
    readonly requestedGuildId: string,
  ) {
    super(
      `Persona "${personaId}" is single-server-bound to guild "${boundGuildId}" and cannot be ` +
        `used or bound in guild "${requestedGuildId}"`,
    );
    this.name = 'SingleServerBoundViolationError';
  }
}

export class ApplicationAlreadyRegisteredError extends Error {
  constructor(readonly discordApplicationId: string) {
    super(
      `Discord application "${discordApplicationId}" is already registered to a persona — ` +
        `one persona = one application`,
    );
    this.name = 'ApplicationAlreadyRegisteredError';
  }
}

export class FreeCharterEndedError extends Error {
  constructor() {
    super(
      `The Twixter free charter has reached its recorded sunset (ADR-008): no new ` +
        `free-charter personas can be registered. New monetization is a separate program, ` +
        `not wired here; existing single-server-bound personas are grandfathered.`,
    );
    this.name = 'FreeCharterEndedError';
  }
}

export class UnknownPersonaError extends Error {
  constructor(readonly personaId: string) {
    super(`No persona "${personaId}" exists`);
    this.name = 'UnknownPersonaError';
  }
}

/** ADR-008 free-charter rule: the sunset condition, computed from the cost signals. */
export function freeCharterStatus(signals: FreeCharterCostSignals): CharterStatus {
  const sunsetEffective =
    signals.dedicatedInfrastructureRequired === true || signals.perPersonaCostMeasurable === true;
  return {
    charter: 'free',
    sunsetEffective,
    condition: FREE_CHARTER_SUNSET_CONDITION,
  };
}

/**
 * The free default ends at the sunset; existing single-server-bound personas
 * are honored (grandfathered). New free-charter registrations are refused when
 * the sunset is effective — the refusal, not a billing gate.
 */
export function assertFreeCharterRegistration(
  grandfathered: boolean,
  signals: FreeCharterCostSignals,
): CharterStatus {
  const status = freeCharterStatus(signals);
  if (status.sunsetEffective && !grandfathered) {
    throw new FreeCharterEndedError();
  }
  return status;
}

/**
 * Builds a persona identity from registration input, enforcing the
 * bring-your-own-identity invariants: the registrar must hold authority over
 * the application (validation), the token is stored only as a digest, and the
 * persona is bound to exactly the commissioning guild.
 */
export function buildPersonaIdentity(input: PersonaRegistrationInput): PersonaIdentity {
  if (input.name.trim().length === 0) {
    throw new Error('persona name is required');
  }
  if (input.discordApplicationId.trim().length === 0) {
    throw new Error('discordApplicationId is required — the persona is the guild-owner identity');
  }
  if (input.boundGuildId.trim().length === 0) {
    throw new Error('boundGuildId is required — one persona = one server');
  }
  if (input.botTokenDigest.trim().length === 0) {
    throw new Error('botTokenDigest is required — the token is never stored in plaintext');
  }
  if (input.registrarAuthority.trim().length === 0) {
    throw new Error(
      'registrarAuthority is required — the registrar must prove authority over the application they own',
    );
  }
  const shardAllocation = input.shardAllocation ?? 1;
  if (!Number.isInteger(shardAllocation) || shardAllocation < 1) {
    throw new Error('shardAllocation must be a positive integer');
  }
  const dmBehavior = input.dmBehavior ?? 'prohibited';
  return {
    id: nextPersonaId(),
    name: input.name,
    discordApplicationId: input.discordApplicationId,
    boundGuildId: input.boundGuildId,
    dmBehavior,
    shardAllocation,
    charter: 'free',
    grandfathered: input.grandfathered ?? false,
    status: 'active',
    botTokenDigest: input.botTokenDigest,
  };
}

export function assertApplicationNotRegistered(existing: PersonaIdentity | undefined): void {
  if (existing === undefined) return;
  throw new ApplicationAlreadyRegisteredError(existing.discordApplicationId);
}

/**
 * The single-server invariant at bind/dispatch time: a persona may only be
 * bound and trusted inside the guild that commissioned it.
 */
export function assertSameGuild(persona: PersonaIdentity, guildId: string): void {
  if (persona.boundGuildId !== guildId) {
    throw new SingleServerBoundViolationError(persona.id, persona.boundGuildId, guildId);
  }
  if (persona.status !== 'active') {
    throw new Error(`Persona "${persona.id}" is not active`);
  }
}

/**
 * The "occupied by another persona" gate (§35.3, ADR-011). The unit of binding
 * is one module in one guild; a bind naming a different persona for an
 * already-bound `(guildId, moduleSlug)` pair is refused.
 */
export function assertBindingAllowed(request: {
  readonly guildId: string;
  readonly moduleSlug: string;
  readonly personaId: string;
  readonly persona: PersonaIdentity;
  readonly existingBinding?: PersonaBinding;
}): void {
  assertSameGuild(request.persona, request.guildId);
  const existing = request.existingBinding;
  if (existing === undefined) return;
  if (existing.personaId !== request.personaId) {
    throw new PersonaOccupiedError(request.guildId, request.moduleSlug, existing.personaId);
  }
}

/** Which identity currently owns a module's command key in a guild. */
export function resolveBindingOwner(
  bindings: readonly PersonaBinding[],
  guildId: string,
  moduleSlug: string,
): string | undefined {
  return bindings.find(
    (binding) => binding.guildId === guildId && binding.moduleSlug === moduleSlug,
  )?.personaId;
}

/** The command inventory a persona holds in a guild (interface.md §7.3). */
export function boundModulesForPersona(
  bindings: readonly PersonaBinding[],
  personaId: string,
): readonly string[] {
  return bindings
    .filter((binding) => binding.personaId === personaId)
    .map((binding) => binding.moduleSlug);
}

let personIdCounter = 0;
function nextPersonaId(): string {
  // Deterministic for tests; the Postgres repository overrides with a uuid.
  personIdCounter += 1;
  return `persona-${personIdCounter}`;
}
