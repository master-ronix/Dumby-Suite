import type { GrantLevel, GrantType, RbacGrant } from './rbac.js';
import type { ModuleTier } from './resolver.js';

export const OVERRIDE_BOUNDARY = Object.freeze({
  layer1BotOwnerOverride: 'the bot-owner override (Layer 1)',
  layer2Blacklist: 'the blacklist (Layer 2)',
  layer3Availability: 'guild and module availability (Layer 3)',
  layer5BotCapability: 'the bot-capability check',
  restrictedFloor: 'the RESTRICTED floor',
} as const);

export const OVERRIDE_BOUNDARY_LAYERS: readonly string[] = Object.freeze([
  OVERRIDE_BOUNDARY.layer1BotOwnerOverride,
  OVERRIDE_BOUNDARY.layer2Blacklist,
  OVERRIDE_BOUNDARY.layer3Availability,
  OVERRIDE_BOUNDARY.layer5BotCapability,
  OVERRIDE_BOUNDARY.restrictedFloor,
]);

export interface ModifyGrantInput {
  guildId: string;
  tier: ModuleTier;
  key: string;
  level: GrantLevel;
  refId: string;
  type: GrantType;
  value?: number;
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
