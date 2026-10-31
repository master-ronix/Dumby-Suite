/**
 * UR-20261012-030 — opening a persona's sealed credentials.
 *
 * A persona carries two secrets that the process must read back: its bot token (Route B removes a
 * guild command with it) and its OAuth2 client secret (Route A mints a user token with it). Both are
 * envelope-encrypted, and both open the same way — through the shared envelope root key.
 */
import { open, type EnvelopeRootKey, type SealedEnvelope } from '../crypto/envelope.js';

const decoder = new TextDecoder();

/**
 * UR-20261012-039 — opens a sealed token, returning '' when it cannot be opened.
 *
 * Route B removes a module's commands with the OWNING application's bot token. If that token could
 * not be unwrapped, opening it threw and took the whole disable flow with it — the state write, the
 * override attempt and the BCCM enqueue all sat behind it. An unreadable token now degrades to '' so
 * the caller falls through to the queued deregistration instead of failing the disable.
 */
export function openBotTokenOrEmpty(
  sealed: SealedEnvelope | undefined,
  rootKey: EnvelopeRootKey,
): string {
  if (sealed === undefined) return '';
  try {
    return openSealedText(sealed, rootKey);
  } catch {
    return '';
  }
}

/** Opens a sealed envelope to its plaintext text. Throws when the envelope cannot be unwrapped. */
export function openSealedText(sealed: SealedEnvelope, rootKey: EnvelopeRootKey): string {
  return decoder.decode(open(sealed, rootKey));
}
