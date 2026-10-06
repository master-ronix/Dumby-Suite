import { randomUUID } from 'node:crypto';
import type { Logger } from '../logging/logger.js';

/**
 * Process-level fatal handlers (Cluster: Grace). Replaces the previous
 * `console.error(...); process.exit(1)` inline handlers (UR-C-18): every
 * uncaughtException gets a structured fatal log carrying a correlation ID,
 * then routes through `system.fatalError` notification and a graceful
 * shutdown bounded to FATAL_SHUTDOWN_CEILING_MS, then exits 1. A rejected
 * promise is logged through the same fatal path but — matching prior
 * behaviour — does not terminate the process on its own.
 */

export const FATAL_SHUTDOWN_CEILING_MS = 15_000;

export interface FatalHandlerHooks {
  logger: Logger;
  /** Emits the `system.fatalError` equivalent on the internal bus, if wired. */
  notify?: (correlationId: string, error: unknown) => void;
  /** Runs graceful shutdown; may be absent in very early bootstrap stages. */
  shutdown?: () => Promise<void>;
  /** Test seam; defaults to `process.exit`. */
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
    } catch {
      // The fatal path must never throw while reporting its own fatal.
    }

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
    } catch {
      // The fatal path must never throw while reporting its own fatal.
    }
  };
}

/** Registers both handlers and returns an uninstall function. */
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

/**
 * Runs `fn` bounded by `ceilingMs`. If the ceiling elapses first, the
 * caller still proceeds to its post-shutdown exit path (the shutdown is
 * abandoned, never allowed to hang the fatal exit).
 */
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
        // Shutdown failure must never abort the fatal exit.
      } finally {
        finish();
      }
    })();
    const timer = setTimeout(finish, ceilingMs);
    timer.unref?.();
  });
}
