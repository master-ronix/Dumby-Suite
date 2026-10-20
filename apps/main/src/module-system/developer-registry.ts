import type { Knex } from 'knex';

/**
 * item 2 — the developer attribution is the platform's **registered username**, not a static name.
 *
 * The account registry is owned by the credentials service, coordinated with Swastik and the
 * development portal: a user registers a display name + unique username on the Dumby website, and
 * a developer id is issued when they switch to a developer account. A module manifest's `devId`
 * must match a live registration for the module to be attributed (and, per the provenance check,
 * to load).
 *
 * This is the framework-side seam for that registry. A dev id that is not registered resolves to
 * `undefined`, and the caller falls back to the module's declared developer rather than inventing
 * a name.
 */
const REGISTERED_DEVELOPERS: Readonly<Record<string, string>> = {
  // The first-party framework account — its registered DISPLAY name. Per SPEC-04-REQUEST-LAYER
  // §1.5 / §11.6 and SPEC-03-MODULES §11.2, a framework-shipped surface attributes to
  // "Quixotic Mnemonics"; the identity band renders this verbatim. (The operator handle
  // `master_ronix` is NOT the developer attribution.)
  dev_first_party: 'Quixotic Mnemonics',
  'qm-dev-001': 'Quixotic Mnemonics',
};

export function resolveRegisteredDeveloper(devId: string | undefined): string | undefined {
  if (devId === undefined) return undefined;
  return REGISTERED_DEVELOPERS[devId];
}

/**
 * UR-20261021-095 — the DB-backed registry. The authoritative developer registry is the `developers`
 * table the Swastik registration flow writes (`devId`, `username`); the static map above is only the
 * frozen first-party fallback. A dev id with no row resolves to `undefined`, and the caller falls
 * back to the declared developer rather than inventing a name.
 */
export interface DeveloperRegistry {
  /** The registered username for a devId, or undefined when it is not registered. */
  resolve(devId: string): Promise<string | undefined>;
}

export class PostgresDeveloperRegistry implements DeveloperRegistry {
  constructor(private readonly knex: Knex) {}

  async resolve(devId: string): Promise<string | undefined> {
    const row = await this.knex('developers')
      .where({ devId })
      .first<{ username: string } | undefined>();
    return row?.username;
  }
}

/**
 * Resolve a batch of devIds to registered usernames, falling back to the frozen static map when the
 * registry holds no row. A registry read that fails is not fatal — attribution is advisory, so the
 * fallback applies. Returns a map keyed by devId.
 */
export async function resolveDeveloperNames(
  devIds: readonly (string | undefined)[],
  registry: DeveloperRegistry | undefined,
): Promise<Map<string, string>> {
  const wanted = [...new Set(devIds.filter((d): d is string => typeof d === 'string'))];
  const out = new Map<string, string>();
  if (registry !== undefined && wanted.length > 0) {
    await Promise.all(
      wanted.map(async (devId) => {
        const name = await registry.resolve(devId).catch(() => undefined);
        if (name !== undefined) out.set(devId, name);
      }),
    );
  }
  for (const devId of wanted) {
    if (!out.has(devId)) {
      const fallback = resolveRegisteredDeveloper(devId);
      if (fallback !== undefined) out.set(devId, fallback);
    }
  }
  return out;
}
