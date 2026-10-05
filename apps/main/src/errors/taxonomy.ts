export interface DumbyErrorOptions {
  code: string;
  httpStatus: number;
  /** §28 — the user-facing message rendered in the formal notice frame. */
  userMessage?: string;
  /** §28 — whether this is an operational (expected) error vs a programmer error. */
  isOperational?: boolean;
  retryable?: boolean;
  cause?: unknown;
  metadata?: Record<string, unknown>;
}

export class DumbyError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly userMessage: string;
  readonly isOperational: boolean;
  readonly retryable: boolean;
  readonly metadata: Record<string, unknown>;

  constructor(message: string, options: DumbyErrorOptions) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.userMessage = options.userMessage ?? message;
    this.isOperational = options.isOperational ?? true;
    this.retryable = options.retryable ?? false;
    this.metadata = options.metadata ?? {};
  }

  toJSON(): {
    error: {
      code: string;
      message: string;
      userMessage: string;
      isOperational: boolean;
      retryable: boolean;
      metadata: Record<string, unknown>;
    };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        userMessage: this.userMessage,
        isOperational: this.isOperational,
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

export const RateLimitExceededError = RateLimitedError;

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

export class ExternalServiceError extends DumbyError {
  constructor(message: string, cause?: unknown) {
    super(message, {
      code: 'DUMBY_EXTERNAL_SERVICE_ERROR',
      httpStatus: 502,
      retryable: true,
      cause,
    });
  }
}

export class ConfigurationError extends DumbyError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super(message, {
      code: 'DUMBY_CONFIGURATION_ERROR',
      httpStatus: 500,
      retryable: false,
      metadata,
    });
  }
}

export class InternalError extends DumbyError {
  constructor(message = 'An unexpected internal error occurred') {
    super(message, {
      code: 'DUMBY_INTERNAL_ERROR',
      httpStatus: 500,
      retryable: false,
      isOperational: false,
      userMessage: 'An unexpected error occurred. The incident has been recorded.',
    });
  }
}

export class UnauthorizedError extends DumbyError {
  constructor(message = 'Unauthorized') {
    super(message, { code: 'DUMBY_UNAUTHORIZED', httpStatus: 401, retryable: false });
  }
}

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

export class CommandCeilingExceededError extends DumbyError {
  readonly projected: number;
  readonly ceiling: number;

  constructor(projected: number, ceiling: number) {
    super(`Command ceiling would be exceeded: projected ${projected}, max ${ceiling}`, {
      code: 'DUMBY_COMMAND_CEILING_EXCEEDED',
      httpStatus: 400,
      retryable: false,
      metadata: { projected, ceiling },
    });
    this.projected = projected;
    this.ceiling = ceiling;
  }
}

export class CollisionPendingError extends DumbyError {
  readonly moduleSlug: string;
  readonly guildId: string;
  readonly collisionCount: number;

  constructor(moduleSlug: string, guildId: string, collisionCount: number) {
    super(
      `Module "${moduleSlug}" has ${collisionCount} unresolved collision(s) in guild ${guildId}`,
      {
        code: 'DUMBY_COLLISION_PENDING',
        httpStatus: 409,
        retryable: false,
        metadata: { moduleSlug, guildId, collisionCount },
      },
    );
    this.moduleSlug = moduleSlug;
    this.guildId = guildId;
    this.collisionCount = collisionCount;
  }
}

export function isDumbyError(value: unknown): value is DumbyError {
  return value instanceof DumbyError;
}
