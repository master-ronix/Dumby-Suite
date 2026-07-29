/**
 * Base middleware interface and context type (Cluster: Ring).
 * Every built-in and module-supplied middleware implements this interface.
 * The MiddlewarePipeline calls execute() in priority order (lower = outermost).
 */

export interface MiddlewareContext {
  /** Discord-level user performing the action. */
  userId: string;
  /** Null for DM interactions. */
  guildId: string | null;
  /** The command being invoked. */
  commandName: string;
  /** Correlation ID — set by TraceMiddleware, never null after priority 0. */
  correlationId: string | null;
  /** Arbitrary extension bag for middleware-to-middleware communication. */
  readonly meta: Record<string, unknown>;
}

export type NextFn = () => Promise<void>;

export interface Middleware {
  /** Lower = outer (runs first/last). Built-in range: -20 to 90. Module range: 100+. */
  readonly priority: number;
  execute(ctx: MiddlewareContext, next: NextFn): Promise<void>;
}

/** Short-circuits the middleware chain by throwing this error internally. */
export class MiddlewareRejectError extends Error {
  constructor(
    readonly statusCode: number,
    readonly reason: string,
    readonly silent: boolean = false,
  ) {
    super(reason);
    this.name = 'MiddlewareRejectError';
  }
}
