/**
 * Grant surface — the in-tree realization of interface.md Division 8
 * (/permit). The interactive Discord flows ship with the volume-delivered
 * `permit` module; this module provides the management vocabulary the flows
 * operate on: the canonical grant types, scopes, and the exhaustive,
 * NON-CONFIGURABLE override boundary (blueprint §21.6).
 *
 * Grant mutations are pure: they take a grant snapshot and return a new
 * one. This mirrors "resolved fresh per interaction, never cached" — the
 * snapshot a dispatch sees is re-read for every command, so an edit here
 * takes effect on the very next invocation.
 */

import type { GrantLevel, GrantType, RbacGrant } from './rbac.js';
import type { ModuleTier } from './resolver.js';

/**
 * The override boundary — exhaustive and non-configurable. Layer 7 grants
 * can override exactly and only Layers 4–6, and module commands only.
 * This list is a property of the engine, never a policy: there is no
 * privileged grant type and no configuration flag that widens it.
 */
export const OVERRIDE_BOUNDARY = Object.freeze({
  layer1BotOwnerOverride: 'the bot-owner override (Layer 1)',
  layer2Blacklist: 'the blacklist (Layer 2)',
  layer3Availability: 'guild and module availability (Layer 3)',
  layer5BotCapability: 'the bot-capability check',
  restrictedFloor: 'the RESTRICTED floor',
} as const);

/** The boundary-immune layers, as a stable list (identical to the object). */
export const OVERRIDE_BOUNDARY_LAYERS: readonly string[] = Object.freeze([
  OVERRIDE_BOUNDARY.layer1BotOwnerOverride,
  OVERRIDE_BOUNDARY.layer2Blacklist,
  OVERRIDE_BOUNDARY.layer3Availability,
  OVERRIDE_BOUNDARY.layer5BotCapability,
  OVERRIDE_BOUNDARY.restrictedFloor,
]);

export interface ModifyGrantInput {
  guildId: string;
  /** Tier of the command's owning module — core commands are not grant-manageable. */
  tier: ModuleTier;
  /** "<module>.<command>" or "<module>.*" (module-wide scope). */
  key: string;
  level: GrantLevel;
  refId: string;
  type: GrantType;
  /** Required for cooldown (ms) and rate-limit (usage ceiling). */
  value?: number;
  /** True when the target is at the RESTRICTED floor and must not be lifted. */
  restrictedTarget?: boolean;
}

export type GrantMutationResult =
  { ok: true; grants: readonly RbacGrant[] } | { ok: false; error: string };

const COMMAND_KEY_PATTERN = /^[a-z][a-z0-9-]*\.([a-z][a-z0-9-]*|\*)$/u;

export function grantBoundaryViolation(input: ModifyGrantInput): string | null {
  if (input.tier === 'core') {
    return 'grants apply to module commands only; core commands are not grant-manageable';
  }
  if (!COMMAND_KEY_PATTERN.test(input.key)) {
    return `invalid grant key "${input.key}"; expected "<module>.<command>" or "<module>.*"`;
  }
  if (input.refId.length === 0) {
    return 'a grant target is required';
  }
  if (input.type === 'permit' && input.restrictedTarget === true) {
    return 'a permit cannot lift the RESTRICTED floor';
  }
  if (input.type === 'cooldown' || input.type === 'rate-limit') {
    if (input.value === undefined || !Number.isFinite(input.value) || input.value <= 0) {
      return `${input.type} grants require a positive value`;
    }
  } else if (input.value !== undefined) {
    return `grant type "${input.type}" carries no value payload`;
  }
  return null;
}

/**
 * Applies a grant, upserting on (guildId, key, level, refId, type) so a
 * retried submission lands as the already-achieved result (idempotency,
 * interface.md §2.4). Refuses mutations that would breach the override
 * boundary.
 */
export function applyGrant(
  grants: readonly RbacGrant[],
  input: ModifyGrantInput,
): GrantMutationResult {
  const violation = grantBoundaryViolation(input);
  if (violation !== null) return { ok: false, error: violation };

  const next: RbacGrant = {
    guildId: input.guildId,
    level: input.level,
    refId: input.refId,
    type: input.type,
    key: input.key,
    ...(input.value !== undefined ? { value: input.value } : {}),
  };

  const remaining = grants.filter(
    (g) =>
      !(
        g.guildId === input.guildId &&
        g.key === input.key &&
        g.level === input.level &&
        g.refId === input.refId &&
        g.type === input.type
      ),
  );
  return { ok: true, grants: [...remaining, next] };
}

export interface RemoveGrantInput {
  guildId: string;
  key: string;
  level: GrantLevel;
  refId: string;
  type: GrantType;
}

/**
 * Removes a grant. Idempotent: removing an absent grant is a success, so a
 * double-submitted removal cannot error.
 */
export function removeGrant(
  grants: readonly RbacGrant[],
  input: RemoveGrantInput,
): GrantMutationResult {
  return {
    ok: true,
    grants: grants.filter(
      (g) =>
        !(
          g.guildId === input.guildId &&
          g.key === input.key &&
          g.level === input.level &&
          g.refId === input.refId &&
          g.type === input.type
        ),
    ),
  };
}

export interface GrantSurface {
  list(): readonly RbacGrant[];
  apply(input: ModifyGrantInput): GrantMutationResult;
  remove(input: RemoveGrantInput): GrantMutationResult;
}

/**
 * A minimal in-memory grant store. Persistence lives in the knex-backed
 * RBAC repository over the four rbac_* tables (blueprint §21.4); read and
 * write character added here for the interactive flows to bind against.
 */
export class InMemoryGrantSurface implements GrantSurface {
  private snapshot: readonly RbacGrant[];

  constructor(initial: readonly RbacGrant[] = []) {
    this.snapshot = initial;
  }

  list(): readonly RbacGrant[] {
    return this.snapshot;
  }

  apply(input: ModifyGrantInput): GrantMutationResult {
    const result = applyGrant(this.snapshot, input);
    if (result.ok) this.snapshot = result.grants;
    return result;
  }

  remove(input: RemoveGrantInput): GrantMutationResult {
    const result = removeGrant(this.snapshot, input);
    if (result.ok) this.snapshot = result.grants;
    return result;
  }
}
