import type { Knex } from 'knex';

export type CommandPermissionTokenStatus = 'active' | 'revoked' | 'expired';

export interface CommandPermissionTokenRecord {
  /** The Discord application that issued the token — the endpoint is per-application (UR-20261012-028). */
  readonly applicationId: string;
  readonly guildId: string;
  readonly authorizingUserId: string;
  readonly accessCredentialId: string;
  readonly refreshCredentialId: string;
  readonly scope: string;
  readonly accessTokenExpiresAt: Date;
  readonly status: CommandPermissionTokenStatus;
  readonly lastRefreshedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CommandPermissionTokenStore {
  upsert(record: CommandPermissionTokenRecord): Promise<void>;
  findByApplicationGuild(
    applicationId: string,
    guildId: string,
  ): Promise<CommandPermissionTokenRecord | undefined>;
  listRefreshable(): Promise<CommandPermissionTokenRecord[]>;
  setStatus(
    applicationId: string,
    guildId: string,
    status: CommandPermissionTokenStatus,
  ): Promise<boolean>;
  /**
   * UR-20261012-028 — adopts pre-key-change rows once the running application's id is known: a row
   * written before `applicationId` existed is re-keyed to this application, so an authorization
   * granted before the change keeps working. A legacy row whose guild already has a real row is
   * deleted instead, since re-keying it would collide. Returns how many rows were re-keyed.
   */
  adoptLegacy(applicationId: string): Promise<number>;
  recordRefresh(
    applicationId: string,
    guildId: string,
    next: {
      accessCredentialId: string;
      refreshCredentialId: string;
      accessTokenExpiresAt: Date;
      lastRefreshedAt: Date;
    },
  ): Promise<boolean>;
}

interface CommandPermissionTokenRow {
  applicationId: string;
  guildId: string;
  authorizingUserId: string;
  accessCredentialId: string;
  refreshCredentialId: string;
  scope: string;
  accessTokenExpiresAt: string;
  status: string;
  lastRefreshedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toRecord(row: CommandPermissionTokenRow): CommandPermissionTokenRecord {
  return {
    applicationId: row.applicationId,
    guildId: row.guildId,
    authorizingUserId: row.authorizingUserId,
    accessCredentialId: row.accessCredentialId,
    refreshCredentialId: row.refreshCredentialId,
    scope: row.scope,
    accessTokenExpiresAt: new Date(row.accessTokenExpiresAt),
    status: row.status as CommandPermissionTokenStatus,
    lastRefreshedAt: row.lastRefreshedAt === null ? null : new Date(row.lastRefreshedAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export class PostgresCommandPermissionTokenStore implements CommandPermissionTokenStore {
  constructor(private readonly knex: Knex) {}

  async upsert(record: CommandPermissionTokenRecord): Promise<void> {
    await this.knex('guild_command_permission_tokens')
      .insert({
        applicationId: record.applicationId,
        guildId: record.guildId,
        authorizingUserId: record.authorizingUserId,
        accessCredentialId: record.accessCredentialId,
        refreshCredentialId: record.refreshCredentialId,
        scope: record.scope,
        accessTokenExpiresAt: record.accessTokenExpiresAt,
        status: record.status,
        lastRefreshedAt: record.lastRefreshedAt,
        deletedAt: null,
      })
      .onConflict(['applicationId', 'guildId'])
      .merge({
        authorizingUserId: record.authorizingUserId,
        accessCredentialId: record.accessCredentialId,
        refreshCredentialId: record.refreshCredentialId,
        scope: record.scope,
        accessTokenExpiresAt: record.accessTokenExpiresAt,
        status: record.status,
        deletedAt: null,
        updatedAt: new Date(),
      });
  }

  async findByApplicationGuild(
    applicationId: string,
    guildId: string,
  ): Promise<CommandPermissionTokenRecord | undefined> {
    const row = await this.knex<CommandPermissionTokenRow>('guild_command_permission_tokens')
      .where({ applicationId, guildId })
      .whereNull('deletedAt')
      .first();
    return row === undefined ? undefined : toRecord(row);
  }

  async listRefreshable(): Promise<CommandPermissionTokenRecord[]> {
    const rows = await this.knex<CommandPermissionTokenRow>('guild_command_permission_tokens')
      .where({ status: 'active' })
      .whereNull('deletedAt');
    return rows.map(toRecord);
  }

  async setStatus(
    applicationId: string,
    guildId: string,
    status: CommandPermissionTokenStatus,
  ): Promise<boolean> {
    const updated = await this.knex('guild_command_permission_tokens')
      .where({ applicationId, guildId })
      .whereNull('deletedAt')
      .update({ status, updatedAt: new Date() });
    return updated > 0;
  }

  async adoptLegacy(applicationId: string): Promise<number> {
    if (applicationId === '') return 0;
    // A legacy row whose guild already has a real row would collide on re-key, so it is dropped.
    await this.knex('guild_command_permission_tokens')
      .where({ applicationId: '' })
      .whereIn(
        'guildId',
        this.knex('guild_command_permission_tokens').where({ applicationId }).select('guildId'),
      )
      .del();
    return this.knex('guild_command_permission_tokens')
      .where({ applicationId: '' })
      .update({ applicationId, updatedAt: new Date() });
  }

  async recordRefresh(
    applicationId: string,
    guildId: string,
    next: {
      accessCredentialId: string;
      refreshCredentialId: string;
      accessTokenExpiresAt: Date;
      lastRefreshedAt: Date;
    },
  ): Promise<boolean> {
    const updated = await this.knex('guild_command_permission_tokens')
      .where({ applicationId, guildId })
      .whereNull('deletedAt')
      .update({
        accessCredentialId: next.accessCredentialId,
        refreshCredentialId: next.refreshCredentialId,
        accessTokenExpiresAt: next.accessTokenExpiresAt,
        lastRefreshedAt: next.lastRefreshedAt,
        status: 'active',
        updatedAt: new Date(),
      });
    return updated > 0;
  }
}
