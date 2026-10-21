import type { Knex } from 'knex';

/**
 * The artwork ledger — which asset produced each application emoji, so a CHANGED asset can be told
 * apart from an unchanged one.
 *
 * Why this exists: `ensureDefaultModuleEmoji` matches an emoji BY NAME and reuses it, so an emoji's
 * artwork is frozen at the moment it was first created. Discord exposes no way to read an emoji's
 * image back, so without a record of what was uploaded there is no way to know whether the emoji in
 * place still matches the file on disk. That is how two applications ended up with the SAME eighteen
 * names holding DIFFERENT artwork: the main bot's emojis were created before the icon assets were
 * redesigned and were never refreshed, while a persona's were created after and got the new artwork.
 *
 * With a recorded hash the uploader can reconcile: same hash → reuse; different (or absent) hash →
 * the artwork cannot be shown to match, so the emoji is replaced and the new hash recorded.
 *
 * Storage is a single `system_state` row — a key/value table that already exists, so this needs no
 * migration. The map is loaded once per boot and written once, so the cost is one read and one write
 * regardless of how many emojis an application holds.
 */

/** `"<applicationId>:<emoji name>"` → the sha256 of the asset that produced it. */
type ArtworkMap = Record<string, string>;

const STATE_KEY = 'application_emoji_hashes';

export interface EmojiArtworkLedger {
  /** The recorded hash for a name on an application, or `undefined` if never recorded. */
  get(applicationId: string, name: string): string | undefined;
  /** Record the hash of the asset now in place. */
  record(applicationId: string, name: string, hash: string): void;
  /** How many names were recorded during this run — for the boot log. */
  readonly recordedCount: number;
  /** Persist everything recorded. */
  save(): Promise<void>;
}

function ledgerKey(applicationId: string, name: string): string {
  // The main bot's scope is the empty string; keep the key readable rather than starting with ':'.
  return `${applicationId === '' ? 'main' : applicationId}:${name}`;
}

/** Open the ledger: read the recorded map, hand back an object that accumulates and saves. */
export async function openEmojiArtworkLedger(knex: Knex): Promise<EmojiArtworkLedger> {
  let map: ArtworkMap = {};
  try {
    const row = (await knex('system_state').where({ key: STATE_KEY }).first()) as
      { value?: unknown } | undefined;
    const value = row?.value;
    if (typeof value === 'string') map = JSON.parse(value) as ArtworkMap;
    else if (typeof value === 'object' && value !== null) map = value as ArtworkMap;
  } catch {
    // A ledger that cannot be read is not fatal: every emoji then reads as "unrecorded" and is
    // reconciled once, which is the correct outcome for an unknown state.
    map = {};
  }

  let recorded = 0;
  return {
    get(applicationId, name) {
      return map[ledgerKey(applicationId, name)];
    },
    record(applicationId, name, hash) {
      map[ledgerKey(applicationId, name)] = hash;
      recorded += 1;
    },
    get recordedCount() {
      return recorded;
    },
    async save() {
      if (recorded === 0) return;
      await knex('system_state')
        .insert({ key: STATE_KEY, value: JSON.stringify(map), updatedBy: 'module-emoji-upload' })
        .onConflict('key')
        .merge({ value: JSON.stringify(map), updatedAt: knex.fn.now() });
    },
  };
}
