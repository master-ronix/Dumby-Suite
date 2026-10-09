import type { Knex } from 'knex';

/**
 * §15.6 / §15.8 / §22.8 — identity issuance is systematic, not ad hoc.
 *
 * Every unique identifier in the platform is allocated by one issuer from a persisted, atomic
 * sequence — one sequence per kind — so an id is unique across processes, restarts and concurrent
 * requests. It is never a `max()+1` race, and never a random string that could collide or be
 * guessed. Each issuance is a single atomic statement, so two pods issuing at the same instant get
 * two different numbers.
 *
 * Who issues what, and how the two services coordinate:
 *   - `developer`  the developer number — issued by the **Credentials Service** (§22.8) at
 *                  registration. Swastik no longer mints it; it asks and records what it is given.
 *   - `credential` the credential handle — issued by the Credentials Service when it mints a keypair.
 *   - `build`      the build number — issued by **Swastik, the deployment service** (§15.8) when it
 *                  accepts a version. It draws the same shared sequence, so build issuance is
 *                  coordinated with credential issuance rather than independent of it.
 *   - `license`    the license handle — issued when a developer's license row is created.
 *
 * The sequence lives in the `identity_sequences` table, which both services share, so the two are
 * coordinated through one source of truth for identity.
 */
export const IDENTITY_KINDS = ['developer', 'credential', 'build', 'license'] as const;
export type IdentityKind = (typeof IDENTITY_KINDS)[number];

export interface IdentityIssuer {
  issue(kind: IdentityKind): Promise<number>;
}

export class IdentityIssuanceError extends Error {
  constructor(kind: IdentityKind) {
    super(`identity issuance failed for kind "${kind}"`);
    this.name = 'IdentityIssuanceError';
  }
}

/** The shared issuer: one atomic insert-or-increment per issuance. */
export class PostgresIdentityIssuer implements IdentityIssuer {
  constructor(private readonly knex: Knex) {}

  async issue(kind: IdentityKind): Promise<number> {
    const result: unknown = await this.knex.raw(
      `insert into identity_sequences (kind, value)
       values (?, 1)
       on conflict (kind) do update set value = identity_sequences.value + 1
       returning value`,
      [kind],
    );
    const rows = (result as { rows?: Array<{ value: string | number }> }).rows ?? [];
    const value = Number(rows[0]?.value ?? Number.NaN);
    if (!Number.isSafeInteger(value) || value <= 0) throw new IdentityIssuanceError(kind);
    return value;
  }
}

/** A process-local issuer for tests and single-process runs. */
export class InMemoryIdentityIssuer implements IdentityIssuer {
  readonly #counters = new Map<IdentityKind, number>();

  async issue(kind: IdentityKind): Promise<number> {
    const next = (this.#counters.get(kind) ?? 0) + 1;
    this.#counters.set(kind, next);
    return next;
  }
}
