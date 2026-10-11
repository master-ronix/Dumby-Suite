/**
 * UR-20261011-010 — the developer display name behind a manifest `devId`.
 *
 * Per SPEC-04-REQUEST-LAYER §1.5/§11.6 (and SPEC-03-MODULES §11.2), a manifest carries an opaque,
 * registered `devId` (the `developers` table key). The surface must attribute the module to the
 * developer's real name, not the raw identifier: framework-shipped surfaces attribute to
 * **Quixotic Mnemonics**, a third-party module to its own developer.
 *
 * There is no developer-name service wired yet (`developers` has no reader — a recorded gap), so the
 * first-party developer identities resolve to the framework name here and an unknown id falls back to
 * the id itself rather than inventing a name.
 */
export const FIRST_PARTY_DEVELOPER = 'Quixotic Mnemonics';

/** The first-party developer identities: the shipped manifest id and the spec's `qm-dev-001`. */
const FIRST_PARTY_DEV_IDS: ReadonlySet<string> = new Set(['dev_first_party', 'qm-dev-001']);

/**
 * Resolves a manifest `devId` to the developer's display name. An absent id is a framework-shipped
 * surface (Quixotic Mnemonics); a first-party id resolves to the same; anything else is returned
 * verbatim until a developer-name service exists.
 */
export function developerName(devId: string | undefined): string {
  if (devId === undefined || devId.length === 0) return FIRST_PARTY_DEVELOPER;
  return FIRST_PARTY_DEV_IDS.has(devId) ? FIRST_PARTY_DEVELOPER : devId;
}
