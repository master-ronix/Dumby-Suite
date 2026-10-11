/**
 * UR-20261011-018 — the per-guild command-permission override, kept out of `bootstrap.ts` (0%
 * covered) so the Bearer-token path is unit-tested.
 *
 * Discord's *Edit Application Command Permissions* endpoint (the guild's Server Settings →
 * Integrations permissions) accepts ONLY a Bearer token carrying
 * `applications.commands.permissions.update`; a bot token is rejected (403, "Bots cannot use this
 * endpoint"). The bot cannot mint that token, so it is provisioned; absent it, the caller still
 * writes state and enqueues the batched BCCM deregistration.
 */

export interface CommandAccessLogger {
  warn(message: string, meta?: Record<string, unknown>): void;
}

export interface SetGuildCommandPermissionsInput {
  /** The Bearer token (user OAuth2). Empty disables the instant override. */
  token: string;
  applicationId: string;
  guildId: string;
  /** The guild's registered commands, as returned by the API. */
  registered: readonly { id: string; name: string }[];
  /** The module's command names; only these are touched. */
  commandNames: ReadonlySet<string>;
  /** Whether to allow (true) or deny (false) `@everyone` on each command. */
  allowed: boolean;
  logger: CommandAccessLogger;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/** Writes the override for each of the module's commands; returns how many were applied. */
export async function setGuildCommandPermissions(
  input: SetGuildCommandPermissionsInput,
): Promise<number> {
  const { token, applicationId, guildId, registered, commandNames, allowed, logger } = input;
  if (token === '') {
    logger.warn('command-access-token-missing', {
      guildId,
      note: 'set DISCORD_COMMAND_PERMISSIONS_TOKEN to hide/restrict commands instantly; BCCM deregistration still applies',
    });
    return 0;
  }
  const doFetch = input.fetchImpl ?? fetch;
  let applied = 0;
  for (const command of registered) {
    if (!commandNames.has(command.name)) continue;
    try {
      const res = await doFetch(
        `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands/${command.id}/permissions`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: [{ id: guildId, type: 1, permission: allowed }] }),
        },
      );
      if (res.ok) applied += 1;
      else
        logger.warn('command-access-set-failed', {
          guildId,
          command: command.name,
          status: res.status,
        });
    } catch (err) {
      logger.warn('command-access-set-failed', {
        guildId,
        command: command.name,
        error: String(err),
      });
    }
  }
  return applied;
}
