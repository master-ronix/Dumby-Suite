import type { Logger } from '../logging/logger.js';
import type {
  CommandPermissionTokenStatus,
  CommandPermissionTokenStore,
} from '../db/repositories/command-permission-token.repository.js';

/** The single scope the command-permissions endpoint requires. */
export const COMMAND_PERMISSION_SCOPE = 'applications.commands.permissions.update';

/** The sealed-at-rest value store; `SealedCredentialService` satisfies this shape. */
export interface TokenSealer {
  issue(label: string, registeredBy: string, value: string): Promise<{ credentialId: string }>;
  read(credentialId: string): Promise<string>;
  revoke(credentialId: string): Promise<boolean>;
}

export interface RefreshedTokenSet {
  accessToken: string;
  refreshToken?: string | undefined;
  expiresIn: number;
}

/** Thrown by the refresher when Discord rejects the refresh (usually a revoked authorization). */
export class OAuth2RefreshError extends Error {
  override readonly name = 'OAuth2RefreshError';
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
  /** A 400/401 on refresh means the grant is gone — the user revoked the app, or it expired. */
  get revoked(): boolean {
    return this.status === 400 || this.status === 401;
  }
}

/** The slice of `DiscordOAuth2Client` this service needs. */
export interface TokenRefresher {
  refreshToken(refreshToken: string): Promise<RefreshedTokenSet>;
}

export interface CommandPermissionTokenServiceDeps {
  store: CommandPermissionTokenStore;
  sealer: TokenSealer;
  refresher: TokenRefresher;
  logger: Logger;
  now?: () => number;
  /** Refresh once the access token has less than this many milliseconds left. */
  refreshLeadMs?: number;
}

export interface ConnectedTokenSet {
  accessToken: string;
  refreshToken?: string | undefined;
  expiresIn: number;
  scope: string;
}

const DEFAULT_REFRESH_LEAD_MS = 24 * 60 * 60 * 1000;

/**
 * UR-20261011-020 — owns the per-guild Discord user token the dashboard's "Authorize Dumby" flow
 * captures: it seals the values at rest, resolves the live access token for the command-permissions
 * write, refreshes before expiry, and records a revoked/expired state when Discord refuses.
 */
export class CommandPermissionTokenService {
  private readonly store: CommandPermissionTokenStore;
  private readonly sealer: TokenSealer;
  private readonly refresher: TokenRefresher;
  private readonly logger: Logger;
  private readonly now: () => number;
  private readonly refreshLeadMs: number;

  constructor(deps: CommandPermissionTokenServiceDeps) {
    this.store = deps.store;
    this.sealer = deps.sealer;
    this.refresher = deps.refresher;
    this.logger = deps.logger;
    this.now = deps.now ?? Date.now;
    this.refreshLeadMs = deps.refreshLeadMs ?? DEFAULT_REFRESH_LEAD_MS;
  }

  /**
   * Store a freshly-authorized token set, sealing both values at rest. UR-20261012-028 — the token
   * belongs to the APPLICATION that issued it, so it is keyed by (applicationId, guildId).
   */
  async connect(
    applicationId: string,
    guildId: string,
    authorizingUserId: string,
    tokens: ConnectedTokenSet,
  ): Promise<void> {
    const label = `${applicationId}:${guildId}`;
    const access = await this.sealer.issue(
      `cmd-perm-access:${label}`,
      authorizingUserId,
      tokens.accessToken,
    );
    const refresh =
      tokens.refreshToken === undefined
        ? null
        : await this.sealer.issue(
            `cmd-perm-refresh:${label}`,
            authorizingUserId,
            tokens.refreshToken,
          );
    await this.store.upsert({
      applicationId,
      guildId,
      authorizingUserId,
      accessCredentialId: access.credentialId,
      refreshCredentialId: refresh?.credentialId ?? '',
      scope: tokens.scope,
      accessTokenExpiresAt: new Date(this.now() + tokens.expiresIn * 1000),
      status: 'active',
      lastRefreshedAt: null,
      createdAt: new Date(this.now()),
      updatedAt: new Date(this.now()),
    });
    this.logger.info('command-permission-token-connected', {
      applicationId,
      guildId,
      authorizingUserId,
      hasRefresh: refresh !== null,
    });
  }

  /**
   * UR-20261012-028 — re-keys any pre-key-change rows to this application, so an authorization
   * granted before the key changed keeps working without a re-authorize. Non-fatal by design: a
   * failure is logged, never thrown, because it must not block boot.
   */
  async adoptLegacy(applicationId: string): Promise<number> {
    try {
      const adopted = await this.store.adoptLegacy(applicationId);
      if (adopted > 0) {
        this.logger.info('command-permission-token-legacy-adopted', {
          applicationId,
          count: adopted,
        });
      }
      return adopted;
    } catch (err) {
      this.logger.warn('command-permission-token-legacy-adopt-failed', {
        applicationId,
        error: String(err),
      });
      return 0;
    }
  }

  /** The live access token for the application in the guild, or undefined when there is none usable. */
  async resolveAccessToken(applicationId: string, guildId: string): Promise<string | undefined> {
    const record = await this.store.findByApplicationGuild(applicationId, guildId);
    if (record === undefined || record.status !== 'active') return undefined;
    if (record.accessTokenExpiresAt.getTime() <= this.now()) return undefined;
    try {
      return await this.sealer.read(record.accessCredentialId);
    } catch (err) {
      this.logger.warn('command-permission-token-unreadable', {
        applicationId,
        guildId,
        error: String(err),
      });
      return undefined;
    }
  }

  /** The connection state a dashboard shows, for one application in one guild. */
  async status(
    applicationId: string,
    guildId: string,
  ): Promise<CommandPermissionTokenStatus | 'none'> {
    const record = await this.store.findByApplicationGuild(applicationId, guildId);
    if (record === undefined) return 'none';
    if (record.status === 'active' && record.accessTokenExpiresAt.getTime() <= this.now()) {
      return record.refreshCredentialId === '' ? 'expired' : 'active';
    }
    return record.status;
  }

  /** Refresh every active token nearing expiry. Returns how many were refreshed / revoked. */
  async refreshDue(): Promise<{ refreshed: number; revoked: number }> {
    const records = await this.store.listRefreshable();
    let refreshed = 0;
    let revoked = 0;
    for (const record of records) {
      if (record.refreshCredentialId === '') continue;
      if (record.accessTokenExpiresAt.getTime() - this.now() > this.refreshLeadMs) continue;
      let refreshValue: string;
      try {
        refreshValue = await this.sealer.read(record.refreshCredentialId);
      } catch (err) {
        await this.store.setStatus(record.applicationId, record.guildId, 'revoked');
        revoked += 1;
        this.logger.warn('command-permission-token-revoked', {
          applicationId: record.applicationId,
          guildId: record.guildId,
          reason: `refresh token unreadable: ${String(err)}`,
        });
        continue;
      }
      try {
        const next = await this.refresher.refreshToken(refreshValue);
        const access = await this.sealer.issue(
          `cmd-perm-access:${record.applicationId}:${record.guildId}`,
          record.authorizingUserId,
          next.accessToken,
        );
        const nextRefreshId =
          next.refreshToken === undefined
            ? record.refreshCredentialId
            : (
                await this.sealer.issue(
                  `cmd-perm-refresh:${record.applicationId}:${record.guildId}`,
                  record.authorizingUserId,
                  next.refreshToken,
                )
              ).credentialId;
        await this.store.recordRefresh(record.applicationId, record.guildId, {
          accessCredentialId: access.credentialId,
          refreshCredentialId: nextRefreshId,
          accessTokenExpiresAt: new Date(this.now() + next.expiresIn * 1000),
          lastRefreshedAt: new Date(this.now()),
        });
        refreshed += 1;
        this.logger.info('command-permission-token-refreshed', {
          applicationId: record.applicationId,
          guildId: record.guildId,
        });
      } catch (err) {
        const isRevoked = err instanceof OAuth2RefreshError && err.revoked;
        await this.store.setStatus(
          record.applicationId,
          record.guildId,
          isRevoked ? 'revoked' : 'expired',
        );
        if (isRevoked) revoked += 1;
        this.logger.warn('command-permission-token-revoked', {
          applicationId: record.applicationId,
          guildId: record.guildId,
          reason: isRevoked
            ? `Discord rejected the refresh (${err instanceof Error ? err.message : String(err)}) — re-authorize from the dashboard`
            : `refresh failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
    return { refreshed, revoked };
  }
}
