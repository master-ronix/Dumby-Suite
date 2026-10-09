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
  // The first-party framework account (Quixotic Mnemonics) — its registered handle.
  dev_first_party: 'master_ronix',
};

export function resolveRegisteredDeveloper(devId: string | undefined): string | undefined {
  if (devId === undefined) return undefined;
  return REGISTERED_DEVELOPERS[devId];
}
