import type { Middleware, MiddlewareContext } from './base-middleware.js';
import { MiddlewareRejectError } from './base-middleware.js';

export interface PipelineResult {
  ok: boolean;
  rejection?: { statusCode: number; reason: string; silent: boolean };
  error?: unknown;
}

export class MiddlewarePipeline {
  private readonly stages: Middleware[] = [];

  add(middleware: Middleware): this {
    this.stages.push(middleware);
    return this;
  }

  sorted(): readonly Middleware[] {
    return [...this.stages].sort((a, b) => a.priority - b.priority);
  }

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
