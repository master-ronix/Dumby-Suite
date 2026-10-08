/**
 * item 2 — the developer attribution resolves to the platform's registered identity, never to a
 * static name and never to the raw `devId`.
 *
 * Identity model (they are four distinct things):
 *   - `devId`       the registered developer identifier, issued at developer registration (§15.6)
 *                   through the Credentials Service. It is as sensitive as a bot token (§32.12) and
 *                   may never be rendered on a user-facing surface.
 *   - `buildId`     the identifier of one uploaded version, assigned by Swastik at upload (§15.8).
 *   - `devName`     the developer's display name — the attribution line (`Developed by <name>`, §1.5).
 *   - `devUsername` the developer's registered @handle — the footer (`<buildId> · @<handle>`).
 *
 * The account registry is owned by the credentials service, coordinated with Swastik and the
 * development portal: a user registers a display name + unique username on the Dumby website, and a
 * developer id is issued when they switch to a developer account. A manifest's `devId` must match a
 * live registration. This is the framework-side seam for that registry; an unregistered `devId`
 * resolves to `undefined`, and the caller falls back to the framework developer rather than
 * printing the identifier.
 */
export interface RegisteredDeveloper {
  /** The developer's display name — shown in the title attribution. */
  readonly name: string;
  /** The developer's registered @handle — shown in the footer. */
  readonly username: string;
}

const REGISTERED_DEVELOPERS: Readonly<Record<number, RegisteredDeveloper>> = {
  // devId 1 — the first-party framework account (Quixotic Mnemonics) and its registered handle.
  1: { name: 'Quixotic Mnemonics', username: 'master_ronix' },
};

export function resolveRegisteredDeveloper(
  devId: number | undefined,
): RegisteredDeveloper | undefined {
  if (devId === undefined) return undefined;
  return REGISTERED_DEVELOPERS[devId];
}
