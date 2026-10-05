/**
 * §32.8 — dynamic token-leak scanning. A Discord bot token has a distinctive three-part base64url
 * shape; any log line carrying one is redacted and a security alert is raised for the bot owner.
 */
export const DISCORD_TOKEN_PATTERN =
  /[MNO][A-Za-z0-9_-]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g;

export function containsTokenLeak(text: string): boolean {
  DISCORD_TOKEN_PATTERN.lastIndex = 0;
  return DISCORD_TOKEN_PATTERN.test(text);
}

export function redactTokens(text: string): string {
  return text.replace(DISCORD_TOKEN_PATTERN, '[REDACTED-TOKEN]');
}

export interface TokenScanResult {
  readonly leaked: boolean;
  readonly redacted: unknown;
}

/** Scans any log argument (string or object) and returns a token-redacted copy. */
export function scanAndRedact(value: unknown): TokenScanResult {
  if (typeof value === 'string') {
    if (!containsTokenLeak(value)) return { leaked: false, redacted: value };
    return { leaked: true, redacted: redactTokens(value) };
  }
  if (value !== null && typeof value === 'object') {
    let json: string;
    try {
      json = JSON.stringify(value);
    } catch {
      return { leaked: false, redacted: value };
    }
    if (!containsTokenLeak(json)) return { leaked: false, redacted: value };
    try {
      return { leaked: true, redacted: JSON.parse(redactTokens(json)) };
    } catch {
      return { leaked: true, redacted: redactTokens(json) };
    }
  }
  return { leaked: false, redacted: value };
}
