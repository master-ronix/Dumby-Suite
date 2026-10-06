import { randomUUID } from 'node:crypto';
import type { Logger } from '../logging/logger.js';

export const FATAL_SHUTDOWN_CEILING_MS = 15_000;

export interface FatalHandlerHooks {
  logger: Logger;
  notify?: (correlationId: string, error: unknown) => void;
  shutdown?: () => Promise<void>;
  exit?: (code: number) => void;
}

export function createUncaughtExceptionHandler(hooks: FatalHandlerHooks) {
  return (error: unknown): void => {
    const correlationId = randomUUID();
    hooks.logger.fatal('uncaught-exception', {
      correlationId,
      error:
        error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    });
    try {
      hooks.notify?.(correlationId, error);
    } catch {}

    void (async () => {
      await withCeiling(hooks.shutdown, FATAL_SHUTDOWN_CEILING_MS);
      (hooks.exit ?? process.exit)(1);
    })();
  };
}

export function createUnhandledRejectionHandler(hooks: FatalHandlerHooks) {
  return (reason: unknown): void => {
    const correlationId = randomUUID();
    hooks.logger.fatal('unhandled-rejection', {
      correlationId,
      error:
        reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason),
    });
    try {
      hooks.notify?.(correlationId, reason);
    } catch {}
  };
}

export function installFatalHandlers(hooks: FatalHandlerHooks): () => void {
  const uncaught = createUncaughtExceptionHandler(hooks);
  const rejected = createUnhandledRejectionHandler(hooks);
  process.on('uncaughtException', uncaught);
  process.on('unhandledRejection', rejected);
  return () => {
    process.removeListener('uncaughtException', uncaught);
    process.removeListener('unhandledRejection', rejected);
  };
}

function withCeiling(fn: (() => Promise<void>) | undefined, ceilingMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    void (async () => {
      try {
        await fn?.();
      } catch {
      } finally {
        finish();
      }
    })();
    const timer = setTimeout(finish, ceilingMs);
    timer.unref?.();
  });
}
