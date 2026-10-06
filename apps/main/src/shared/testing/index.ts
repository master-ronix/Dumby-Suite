/**
 * Shared test helpers (Cluster: Core shared).
 * Imported only by tests — never by production code.
 */

/** Creates a minimal mock logger that captures calls. */
export function createMockLogger() {
  const calls: { level: string; msg: string; ctx: unknown }[] = [];
  const logger = {
    trace: (msg: string, ctx: unknown = {}) => {
      calls.push({ level: 'trace', msg, ctx });
    },
    debug: (msg: string, ctx: unknown = {}) => {
      calls.push({ level: 'debug', msg, ctx });
    },
    info: (msg: string, ctx: unknown = {}) => {
      calls.push({ level: 'info', msg, ctx });
    },
    warn: (msg: string, ctx: unknown = {}) => {
      calls.push({ level: 'warn', msg, ctx });
    },
    error: (msg: string, ctx: unknown = {}) => {
      calls.push({ level: 'error', msg, ctx });
    },
    fatal: (msg: string, ctx: unknown = {}) => {
      calls.push({ level: 'fatal', msg, ctx });
    },
    child: () => createMockLogger(),
    setLevel: (_level: string) => {
      /* no-op */
    },
    calls,
  };
  return logger;
}

export type MockLogger = ReturnType<typeof createMockLogger>;
