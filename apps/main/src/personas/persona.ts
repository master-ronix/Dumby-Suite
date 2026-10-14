import { createHash, randomUUID } from 'node:crypto';
import { open, seal, type EnvelopeRootKey, type SealedEnvelope } from '../crypto/envelope.js';

export const DM_BEHAVIORS = ['prohibited', 'allowed'] as const;
export type PersonaDmBehavior = (typeof DM_BEHAVIORS)[number];

export const PERSONA_STATUSES = ['active', 'retired'] as const;
export type PersonaStatus = (typeof PERSONA_STATUSES)[number];

/**
 * UR-20261012-081 — the bot's Discord PRESENCE. Distinct from `PERSONA_STATUSES`, which is the
 * persona's lifecycle (active/retired). Setting one must never mean the other.
 */
export const PERSONA_PRESENCE_STATUSES = ['online', 'dnd', 'idle', 'invisible'] as const;
export type PersonaPresenceStatus = (typeof PERSONA_PRESENCE_STATUSES)[number];

/** A hex accent: `#RGB` or `#RRGGBB`. */
export const ACCENT_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class InvalidPersonaFieldError extends Error {
  constructor(
    readonly field: string,
    reason: string,
  ) {
    super(`Invalid ${field}: ${reason}`);
    this.name = 'InvalidPersonaFieldError';
  }
}

/** The Discord presence int for an accent, for surfaces that take a colour number. */
export function accentToInt(accent: string): number {
  const hex = accent.slice(1);
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  return Number.parseInt(full, 16);
}

export const PERSONA_CHARTERS = ['free'] as const;
export type PersonaCharterKind = (typeof PERSONA_CHARTERS)[number];

export const FREE_CHARTER_SUNSET_CONDITION =
  'Personas run free until sunset: the free default ends when Persona fleet ' +
  'capacity requires dedicated infrastructure beyond the shared deployment, or ' +
  'when any per-Persona cost line becomes measurable in the host accounting — ' +
  'whichever comes first. Existing single-server-bound personas are honored ' +
  'under a grandfathering decision made openly at that point.';

export interface PersonaIdentity {
  readonly id: string;
  readonly name: string;
  readonly discordApplicationId: string;
  readonly boundGuildId: string;
  readonly dmBehavior: PersonaDmBehavior;
  readonly shardAllocation: number;
  readonly charter: PersonaCharterKind;
  readonly grandfathered: boolean;
  readonly status: PersonaStatus;
  readonly botTokenDigest: string;
  /**
   * ADR-003 / §35: the persona's bot token is a credential Twill must *use*, so it is stored
   * envelope-encrypted (in-process-readable) — not under a one-way hash. `botTokenDigest` is kept
   * only as a non-reversible equality/lookup aid alongside it.
   */
  readonly botTokenSealed: SealedEnvelope;
  /**
   * UR-20261012-030 — the persona application's OAuth2 client secret, sealed the same way. Present
   * only when the registration supplied it; absent, the persona has no Route A authorization and the
   * bot-token fallback (Route B) applies.
   */
  readonly oauthClientSecretSealed?: SealedEnvelope;
  /**
   * UR-20261012-073 — when this persona's OAuth leg last completed. A successful code exchange is
   * proof Discord accepted the persona's redirect URI, because the exchange cannot succeed unless the
   * authorize leg sent a registered one. Absent means "never completed".
   */
  readonly oauthVerifiedAt?: string;
  /** UR-20261012-081 — the bot's Discord presence; absent means "not configured". */
  readonly presenceStatus?: PersonaPresenceStatus;
  /** UR-20261012-081 — the status quote shown beside the bot's name. */
  readonly note?: string;
  /** UR-20261012-081 — the hex accent for the persona's rendered surfaces. */
  readonly accent?: string;
}

/**
 * UR-20261012-081 — what an update may change. Everything optional: a PATCH carries only what it
 * changes, and an absent field is left alone rather than cleared.
 *
 * Credentials are deliberately NOT here. A credential change is its own operation with its own audit
 * trail, because it is the one change that can strand a running persona.
 */
/**
 * UR-20261012-081 — validate an update and turn it into the COLUMNS to write. Only the keys present
 * become columns, so an omitted field is left alone; an explicit `null` clears the column.
 *
 * Validation lives here rather than at the route so every caller — route, CLI, a future dashboard —
 * gets the same rules. An invalid value is refused by NAME, because a 400 that says "bad request" is
 * a support ticket.
 */
export function toPersonaUpdateColumns(
  patch: PersonaUpdateInput,
): Readonly<Record<string, unknown>> {
  const columns: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    if (patch.name.trim() === '') throw new InvalidPersonaFieldError('name', 'must not be empty');
    columns['name'] = patch.name;
  }
  if (patch.dmBehavior !== undefined) {
    if (!DM_BEHAVIORS.includes(patch.dmBehavior)) {
      throw new InvalidPersonaFieldError('dmBehavior', `must be one of ${DM_BEHAVIORS.join(', ')}`);
    }
    columns['dmBehavior'] = patch.dmBehavior;
  }
  if (patch.shardAllocation !== undefined) {
    if (!Number.isInteger(patch.shardAllocation) || patch.shardAllocation < 1) {
      throw new InvalidPersonaFieldError('shardAllocation', 'must be a positive integer');
    }
    columns['shardAllocation'] = patch.shardAllocation;
  }
  if (patch.presenceStatus !== undefined) {
    if (patch.presenceStatus === null) {
      columns['presenceStatus'] = null;
    } else if (!PERSONA_PRESENCE_STATUSES.includes(patch.presenceStatus)) {
      throw new InvalidPersonaFieldError(
        'presenceStatus',
        `must be one of ${PERSONA_PRESENCE_STATUSES.join(', ')}`,
      );
    } else {
      columns['presenceStatus'] = patch.presenceStatus;
    }
  }
  if (patch.note !== undefined) {
    if (patch.note === null) {
      columns['note'] = null;
    } else if (patch.note.length > 128) {
      throw new InvalidPersonaFieldError('note', 'must be 128 characters or fewer');
    } else {
      columns['note'] = patch.note;
    }
  }
  if (patch.accent !== undefined) {
    if (patch.accent === null) {
      columns['accent'] = null;
    } else if (!ACCENT_PATTERN.test(patch.accent)) {
      throw new InvalidPersonaFieldError('accent', 'must be a hex colour like #7A5AF8 or #7AF');
    } else {
      columns['accent'] = patch.accent;
    }
  }
  if (patch.status !== undefined) {
    if (!PERSONA_STATUSES.includes(patch.status)) {
      throw new InvalidPersonaFieldError('status', `must be one of ${PERSONA_STATUSES.join(', ')}`);
    }
    columns['status'] = patch.status;
  }
  return columns;
}

export interface PersonaUpdateInput {
  readonly name?: string;
  readonly dmBehavior?: PersonaDmBehavior;
  readonly shardAllocation?: number;
  readonly presenceStatus?: PersonaPresenceStatus | null;
  readonly note?: string | null;
  readonly accent?: string | null;
  readonly status?: PersonaStatus;
}

export interface PersonaRegistrationInput {
  readonly name: string;
  readonly discordApplicationId: string;
  readonly boundGuildId: string;
  readonly botTokenDigest: string;
  readonly botTokenSealed: SealedEnvelope;
  /** UR-20261012-030 — optional; without it the persona cannot authorize (Route B applies). */
  readonly oauthClientSecretSealed?: SealedEnvelope;
  readonly registrarAuthority: string;
  readonly dmBehavior?: PersonaDmBehavior;
  readonly shardAllocation?: number;
  readonly grandfathered?: boolean;
  /** UR-20261012-081 — optional presentation, settable at registration and afterwards. */
  readonly presenceStatus?: PersonaPresenceStatus;
  readonly note?: string;
  readonly accent?: string;
}

export interface PersonaBinding {
  readonly guildId: string;
  readonly moduleSlug: string;
  readonly personaId: string;
}

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
  /**
   * UR-20261012-077 — the ACTOR is named, not only the owner.
   *
   * The message used to read "occupied by another persona ... already bound to persona X" whatever
   * the actor was. When the MAIN BOT was refused a module a persona owned, that phrasing led a
   * careful reader to conclude a persona had been refused for holding its own module — the wrong
   * diagnosis, reached from the message alone. A refusal has two parties; naming one is half a
   * message.
   */
  constructor(
    readonly guildId: string,
    readonly moduleSlug: string,
    readonly personaId: string,
    readonly actorId: string = 'main',
  ) {
    super(
      `Command key "${moduleSlug}" in guild "${guildId}" is owned by persona "${personaId}", ` +
        `so "${actorId}" may not install or claim it`,
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
      `The Twill free charter has reached its recorded sunset (ADR-008): no new ` +
        `free-charter personas can be registered. New monetization is a separate program, ` +
        `not wired here; existing single-server-bound personas are grandfathered.`,
    );
    this.name = 'FreeCharterEndedError';
  }
}

/**
 * UR-20261012-037 — the registrar is not recorded against this application. Authentication on the
 * registration API is the internal key; THIS is authorisation: who may register what.
 */
export class RegistrarNotAuthorisedError extends Error {
  constructor(
    readonly authority: string,
    readonly discordApplicationId: string,
  ) {
    super(
      `registrar "${authority}" is not authorised to register a persona for application ` +
        `"${discordApplicationId}" — grant it first (POST /twill/registrars, or the ` +
        `PERSONA_REGISTRAR_AUTHORITIES seed)`,
    );
    this.name = 'RegistrarNotAuthorisedError';
  }
}

export class UnknownPersonaError extends Error {
  constructor(readonly personaId: string) {
    super(`No persona "${personaId}" exists`);
    this.name = 'UnknownPersonaError';
  }
}

export function freeCharterStatus(signals: FreeCharterCostSignals): CharterStatus {
  const sunsetEffective =
    signals.dedicatedInfrastructureRequired === true || signals.perPersonaCostMeasurable === true;
  return {
    charter: 'free',
    sunsetEffective,
    condition: FREE_CHARTER_SUNSET_CONDITION,
  };
}

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
  if (input.botTokenSealed.ciphertext.trim().length === 0) {
    throw new Error(
      'botTokenSealed is required — ADR-003: a credential Twill must use cannot be stored under a one-way hash',
    );
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
    botTokenSealed: input.botTokenSealed,
    ...(input.oauthClientSecretSealed !== undefined
      ? { oauthClientSecretSealed: input.oauthClientSecretSealed }
      : {}),
  };
}

export function assertApplicationNotRegistered(existing: PersonaIdentity | undefined): void {
  if (existing === undefined) return;
  throw new ApplicationAlreadyRegisteredError(existing.discordApplicationId);
}

export function assertSameGuild(persona: PersonaIdentity, guildId: string): void {
  if (persona.boundGuildId !== guildId) {
    throw new SingleServerBoundViolationError(persona.id, persona.boundGuildId, guildId);
  }
  if (persona.status !== 'active') {
    throw new Error(`Persona "${persona.id}" is not active`);
  }
}

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

export function resolveBindingOwner(
  bindings: readonly PersonaBinding[],
  guildId: string,
  moduleSlug: string,
): string | undefined {
  return bindings.find(
    (binding) => binding.guildId === guildId && binding.moduleSlug === moduleSlug,
  )?.personaId;
}

export function boundModulesForPersona(
  bindings: readonly PersonaBinding[],
  personaId: string,
): readonly string[] {
  return bindings
    .filter((binding) => binding.personaId === personaId)
    .map((binding) => binding.moduleSlug);
}

export function derivePersonaBotTokenDigest(botToken: string): string {
  return createHash('sha256').update(botToken, 'utf8').digest('hex');
}

/** ADR-003 — seal a persona's bot token for at-rest storage (in-process-readable). */
export function sealPersonaBotToken(botToken: string, rootKey: EnvelopeRootKey): SealedEnvelope {
  return seal(Buffer.from(botToken, 'utf8'), rootKey);
}

/** UR-20261012-030 — seal a persona's OAuth2 client secret for at-rest storage. */
export function sealPersonaOAuthClientSecret(
  clientSecret: string,
  rootKey: EnvelopeRootKey,
): SealedEnvelope {
  return seal(Buffer.from(clientSecret, 'utf8'), rootKey);
}

/** ADR-003 — read a persona's bot token back in process (Twill presents it to Discord). */
export function openPersonaBotToken(persona: PersonaIdentity, rootKey: EnvelopeRootKey): string {
  return Buffer.from(open(persona.botTokenSealed, rootKey)).toString('utf8');
}

function nextPersonaId(): string {
  // Appendix C #23 — ids must not come from a process-local counter (they collide across replicas).
  //
  // UR-20261012-048 — a BARE uuid, not `persona-<uuid>`. `persona_identities.id` is declared
  // `table.uuid('id')` and `guild_persona_bindings.personaId` is a `uuid` FK to it, so a prefixed
  // string is rejected by Postgres before anything is created:
  //   invalid input syntax for type uuid: "persona-…"
  // Registration could therefore NEVER succeed. The prefix was decorative — nothing reads it — so the
  // generator was the side that disagreed with the schema.
  return randomUUID();
}
