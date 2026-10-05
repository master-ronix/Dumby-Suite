import { randomUUID } from 'node:crypto';

/**
 * UR-C-06's SC-01 residue: the CLAI ssh2 session had no connection limit, no byte limit, and only
 * partial ANSI-escape stripping. These are the pure, unit-testable primitives the entry point
 * wires in.
 */
export const CLAI_DEFAULT_MAX_SESSIONS = 5;
export const CLAI_DEFAULT_MAX_BYTES_PER_SESSION = 65_536;

/**
 * Strips terminal escape sequences and control characters from operator input: CSI
 * (`ESC [ … final`), OSC (`ESC ] … BEL|ST`), other two-character escapes (`ESC x`), and any
 * remaining C0 control character except tab/newline/carriage-return. This is deliberately broader
 * than the CSI-only regex the entry point shipped before.
 */
export function stripAnsi(input: string): string {
  return input
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[\x20-\x7e]/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

/**
 * A bounded session pool: at most `maxSessions` concurrent sessions, and at most
 * `maxBytesPerSession` bytes read per session. `open` returns null when the pool is full; a
 * caller that gets a token must `close` it exactly once. `account` returns false once a session
 * has exceeded its byte budget, signalling the caller to drop the connection.
 */
export class ClaiSessionLimiter {
  readonly #maxSessions: number;
  readonly #maxBytesPerSession: number;
  readonly #bytes = new Map<string, number>();

  constructor(
    maxSessions: number = CLAI_DEFAULT_MAX_SESSIONS,
    maxBytesPerSession: number = CLAI_DEFAULT_MAX_BYTES_PER_SESSION,
  ) {
    this.#maxSessions = maxSessions;
    this.#maxBytesPerSession = maxBytesPerSession;
  }

  open(): string | null {
    if (this.#bytes.size >= this.#maxSessions) return null;
    const token = randomUUID();
    this.#bytes.set(token, 0);
    return token;
  }

  close(token: string): void {
    this.#bytes.delete(token);
  }

  /** Records `bytes` against the session; returns false when the budget is now exceeded. */
  account(token: string, bytes: number): boolean {
    const used = (this.#bytes.get(token) ?? 0) + bytes;
    this.#bytes.set(token, used);
    return used <= this.#maxBytesPerSession;
  }

  get activeSessions(): number {
    return this.#bytes.size;
  }
}
