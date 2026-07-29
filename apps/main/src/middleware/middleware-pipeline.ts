/**
 * Middleware pipeline (Cluster: Ring).
 *
 * Strict onion model: stages execute in ascending priority order (lowest
 * priority = outermost), and on the return path in reverse order. Any
 * stage can call next() or reject() — rejection unwinds the stack outward
 * without calling any deeper stage.
 *
 * One outermost try/catch wraps the entire onion — module authors never
 * write their own top-level error handlers (blueprint.md §19.4).
 */
import type { Middleware, MiddlewareContext } from './base-middleware.js';
import { MiddlewareRejectError } from './base-middleware.js';

export interface PipelineResult {
  ok: boolean;
  /** Set when a middleware rejected the request. */
  rejection?: { statusCode: number; reason: string; silent: boolean };
  /** Set when an unexpected error escaped the pipeline. */
  error?: unknown;
}

export class MiddlewarePipeline {
  private readonly stages: Middleware[] = [];

  /** Register a middleware. May be called before or after build(). */
  add(middleware: Middleware): this {
    this.stages.push(middleware);
    return this;
  }

  /** Returns stages sorted by priority ascending (immutable snapshot). */
  sorted(): readonly Middleware[] {
    return [...this.stages].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute the pipeline against a context. Returns a result object
   * rather than throwing so callers can map outcomes to Discord replies.
   */
  async execute(ctx: MiddlewareContext, handler: () => Promise<void>): Promise<PipelineResult> {
    const stages = this.sorted();
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < stages.length) {
        const stage = stages[index++];
        if (!stage) return;
        await stage.execute(ctx, next);
      } else {
        await handler();
      }
    };

    try {
      await next();
      return { ok: true };
    } catch (err) {
      if (err instanceof MiddlewareRejectError) {
        return {
          ok: false,
          rejection: { statusCode: err.statusCode, reason: err.reason, silent: err.silent },
        };
      }
      return { ok: false, error: err };
    }
  }
}
