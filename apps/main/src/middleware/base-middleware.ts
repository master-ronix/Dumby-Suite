export interface MiddlewareContext {
  userId: string;
  guildId: string | null;
  commandName: string;
  correlationId: string | null;
  readonly meta: Record<string, unknown>;
}

export type NextFn = () => Promise<void>;

export interface Middleware {
  readonly priority: number;
  execute(ctx: MiddlewareContext, next: NextFn): Promise<void>;
}

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
