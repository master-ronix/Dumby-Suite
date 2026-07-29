/**
 * Error taxonomy (Cluster: Keepy — feeds the root error boundary).
 *
 * Every application-thrown error extends DumbyError so the root error
 * boundary (see src/http/error-boundary.ts) can map it to a JSON response
 * deterministically instead of leaking stack traces or ad-hoc shapes.
 *
 * This file has ZERO external dependencies on purpose so it can be unit
 * tested directly in any environment, including one with no package
 * registry access.
 */

export interface DumbyErrorOptions {
  code: string;
  httpStatus: number;
  retryable?: boolean;
  cause?: unknown;
  metadata?: Record<string, unknown>;
}

export class DumbyError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly metadata: Record<string, unknown>;

  constructor(message: string, options: DumbyErrorOptions) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.retryable = options.retryable ?? false;
    this.metadata = options.metadata ?? {};
  }

  /** Shape returned by every JSON API error response. */
  toJSON(): { error: { code: string; message: string; retryable: boolean; metadata: Record<string, unknown> } } {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        metadata: this.metadata,
      },
    };
  }
}

export class ValidationError extends DumbyError {
  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message, {
      code: 'DUMBY_VALIDATION_ERROR',
      httpStatus: 400,
      retryable: false,
      metadata: { fieldErrors },
    });
  }
}

/** Layer index is 1-7, matching the seven-layer permission resolver. */
export class PermissionDeniedError extends DumbyError {
  readonly layerIndex: number;
  readonly reason: string;

  constructor(layerIndex: number, reason: string, metadata: Record<string, unknown> = {}) {
    if (layerIndex < 1 || layerIndex > 7) {
      throw new RangeError(`layerIndex must be between 1 and 7, got ${layerIndex}`);
    }
    super(`Permission denied at layer ${layerIndex}: ${reason}`, {
      code: 'DUMBY_PERMISSION_DENIED',
      httpStatus: 403,
      retryable: false,
      metadata: { layerIndex, reason, ...metadata },
    });
    this.layerIndex = layerIndex;
    this.reason = reason;
  }
}

export class NotFoundError extends DumbyError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} not found: ${id}` : `${resource} not found`, {
      code: 'DUMBY_NOT_FOUND',
      httpStatus: 404,
      retryable: false,
      metadata: { resource, id },
    });
  }
}

export class ConflictError extends DumbyError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, { code: 'DUMBY_CONFLICT', httpStatus: 409, retryable: false, metadata });
  }
}

export class RateLimitedError extends DumbyError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number, scope: 'user' | 'guild' | 'global' = 'user') {
    super(`Rate limit exceeded for scope "${scope}"`, {
      code: 'DUMBY_RATE_LIMITED',
      httpStatus: 429,
      retryable: true,
      metadata: { retryAfterMs, scope },
    });
    this.retryAfterMs = retryAfterMs;
  }
}

export class MaintenanceModeError extends DumbyError {
  constructor(reason?: string) {
    super('System is in maintenance mode', {
      code: 'DUMBY_MAINTENANCE_MODE',
      httpStatus: 503,
      retryable: true,
      metadata: { reason: reason ?? null },
    });
  }
}

export type DependentSystem = 'postgres' | 'redis' | 'queue';

export class DependencyUnavailableError extends DumbyError {
  readonly system: DependentSystem;

  constructor(system: DependentSystem, cause?: unknown) {
    super(`Dependency unavailable: ${system}`, {
      code: 'DUMBY_DEPENDENCY_UNAVAILABLE',
      httpStatus: 503,
      retryable: true,
      cause,
      metadata: { system },
    });
    this.system = system;
  }
}

export class EventCycleError extends DumbyError {
  readonly chain: readonly string[];

  constructor(chain: readonly string[]) {
    super(`Event emit cycle detected: ${chain.join(' -> ')}`, {
      code: 'DUMBY_EVENT_CYCLE',
      httpStatus: 500,
      retryable: false,
      metadata: { chain },
    });
    this.chain = chain;
  }
}

export class UnauthorizedError extends DumbyError {
  constructor(message = 'Unauthorized') {
    super(message, { code: 'DUMBY_UNAUTHORIZED', httpStatus: 401, retryable: false });
  }
}

/**
 * Sentinel returned by a cross-module accessor when the *depended-on*
 * module is disabled for the current guild, instead of throwing. Consumers
 * pattern-match on `isModuleDisabledResult` and degrade gracefully
 * (Cluster: Bridge — soft-dependency degradation).
 */
export const MODULE_DISABLED = Symbol('ModuleDisabledResult');

export interface ModuleDisabledResult {
  readonly kind: typeof MODULE_DISABLED;
  readonly moduleId: string;
}

export function moduleDisabledResult(moduleId: string): ModuleDisabledResult {
  return { kind: MODULE_DISABLED, moduleId };
}

export function isModuleDisabledResult(value: unknown): value is ModuleDisabledResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    (value as { kind: unknown }).kind === MODULE_DISABLED
  );
}

export function isDumbyError(value: unknown): value is DumbyError {
  return value instanceof DumbyError;
}
