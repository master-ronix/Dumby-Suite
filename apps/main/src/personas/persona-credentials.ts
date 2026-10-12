/**
 * UR-20261012-030 — opening a persona's sealed credentials.
 *
 * A persona carries two secrets that the process must read back: its bot token (Route B removes a
 * guild command with it) and its OAuth2 client secret (Route A mints a user token with it). Both are
 * envelope-encrypted, and both open the same way — through the shared envelope root key.
 */
import { open, type EnvelopeRootKey, type SealedEnvelope } from '../crypto/envelope.js';

const decoder = new TextDecoder();

/** Opens a sealed envelope to its plaintext text. Throws when the envelope cannot be unwrapped. */
export function openSealedText(sealed: SealedEnvelope, rootKey: EnvelopeRootKey): string {
  return decoder.decode(open(sealed, rootKey));
}
