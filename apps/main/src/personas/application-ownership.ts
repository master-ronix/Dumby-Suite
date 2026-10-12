/**
 * UR-20261012-041 — proving an applicant owns the Discord application they are registering.
 *
 * ADR-011 and ADR-008 make persona registration BRING-YOUR-OWN-IDENTITY: the guild administrator
 * supplies their own bot token and application, and Dumby hosts the result. So the question a
 * registration must answer is not "may this person register?" but "does this person actually hold
 * this application?".
 *
 * The bot token answers it. `GET /applications/@me` with that token returns the application the token
 * belongs to; if its id is the one being claimed, the caller demonstrably holds it. That is a real
 * proof of ownership, needs no allowlist, and scales to every guild administrator without an operator
 * in the loop — which a hardcoded registrar list cannot.
 */
export interface ApplicationOwnershipInput {
  readonly botToken: string;
  readonly discordApplicationId: string;
  /** Injectable for tests; defaults to the global fetch. */
  readonly fetchImpl?: typeof fetch;
}

export type ApplicationOwnershipResult =
  { readonly owned: true } | { readonly owned: false; readonly reason: string };

/** Confirms the bot token belongs to the claimed application. Never throws. */
export async function verifyApplicationOwnership(
  input: ApplicationOwnershipInput,
): Promise<ApplicationOwnershipResult> {
  if (input.botToken === '') return { owned: false, reason: 'no bot token supplied' };
  if (input.discordApplicationId === '') {
    return { owned: false, reason: 'no application id supplied' };
  }
  const doFetch = input.fetchImpl ?? fetch;
  try {
    const res = await doFetch('https://discord.com/api/v10/applications/@me', {
      headers: { Authorization: `Bot ${input.botToken}` },
    });
    if (!res.ok) {
      // 401 means the token is wrong or revoked; either way it does not prove ownership.
      return { owned: false, reason: `Discord rejected the bot token (status ${res.status})` };
    }
    const body = (await res.json()) as { id?: unknown };
    if (typeof body.id !== 'string') {
      return { owned: false, reason: 'Discord returned no application id for that token' };
    }
    if (body.id !== input.discordApplicationId) {
      return {
        owned: false,
        reason: `the bot token belongs to application ${body.id}, not ${input.discordApplicationId}`,
      };
    }
    return { owned: true };
  } catch (err) {
    return { owned: false, reason: `could not reach Discord: ${String(err)}` };
  }
}
