export interface Collision {
  readonly commandKey: string;
  readonly incomingModule: string;
  readonly existingModule: string;
}

export interface PendingResolution {
  readonly guildId: string;
  readonly moduleSlug: string;
  readonly collisions: readonly Collision[];
  readonly createdAt: Date;
}

export interface ResolvedOverride {
  readonly guildId: string;
  readonly commandKey: string;
  readonly winningModule: string;
  readonly losingModule: string;
  readonly overrideType: 'enabled' | 'disabled';
}

export class CollisionResolutionError extends Error {
  readonly guildId: string;
  readonly moduleSlug: string;

  constructor(guildId: string, moduleSlug: string, message: string) {
    super(`Collision resolution error for module "${moduleSlug}" in guild ${guildId}: ${message}`);
    this.name = 'CollisionResolutionError';
    this.guildId = guildId;
    this.moduleSlug = moduleSlug;
  }
}

export interface CollisionResolutionDeps {
  getActiveCommands: (
    guildId: string,
  ) => Promise<readonly { commandKey: string; moduleId: string }[]>;
  getModuleCommands: (moduleSlug: string) => Promise<readonly string[]>;
  getModuleState: (guildId: string, moduleSlug: string) => Promise<string | undefined>;
  setModuleState: (guildId: string, moduleSlug: string, state: string) => Promise<void>;
  writeOverride: (override: ResolvedOverride) => Promise<void>;
  getOverride: (guildId: string, commandKey: string) => Promise<ResolvedOverride | undefined>;
  deleteOverride: (guildId: string, commandKey: string) => Promise<void>;
  listPendingResolutions: (guildId: string) => Promise<readonly PendingResolution[]>;
}

export class CollisionResolutionService {
  constructor(private readonly deps: CollisionResolutionDeps) {}

  async detectCollisions(guildId: string, moduleSlug: string): Promise<readonly Collision[]> {
    const moduleCommands = await this.deps.getModuleCommands(moduleSlug);
    if (moduleCommands.length === 0) return [];

    const activeCommands = await this.deps.getActiveCommands(guildId);
    const activeByKey = new Map(activeCommands.map((c) => [c.commandKey, c.moduleId]));

    const collisions: Collision[] = [];
    for (const cmd of moduleCommands) {
      const existing = activeByKey.get(cmd);
      if (existing && existing !== moduleSlug) {
        collisions.push({
          commandKey: cmd,
          incomingModule: moduleSlug,
          existingModule: existing,
        });
      }
    }
    return collisions;
  }

  async pauseOnCollision(guildId: string, moduleSlug: string): Promise<readonly Collision[]> {
    const collisions = await this.detectCollisions(guildId, moduleSlug);
    if (collisions.length > 0) {
      await this.deps.setModuleState(guildId, moduleSlug, 'install_pending_resolution');
    }
    return collisions;
  }

  async resolveCollision(
    guildId: string,
    moduleSlug: string,
    commandKey: string,
    resolveInFavourOf: string,
  ): Promise<ResolvedOverride> {
    const existing = await this.deps.getOverride(guildId, commandKey);
    if (existing) {
      throw new CollisionResolutionError(
        guildId,
        moduleSlug,
        `Command "${commandKey}" already has an override for this guild`,
      );
    }

    const override: ResolvedOverride = {
      guildId,
      commandKey,
      winningModule: resolveInFavourOf,
      losingModule: moduleSlug,
      overrideType: 'disabled',
    };
    await this.deps.writeOverride(override);
    return override;
  }

  async finalizeResolution(guildId: string, moduleSlug: string): Promise<boolean> {
    const state = await this.deps.getModuleState(guildId, moduleSlug);
    if (state !== 'install_pending_resolution') return false;

    const pendingCollisions = await this.listPendingCollisions(guildId, moduleSlug);
    if (pendingCollisions.length > 0) return false;

    await this.deps.setModuleState(guildId, moduleSlug, 'active');
    return true;
  }

  private async listPendingCollisions(
    guildId: string,
    moduleSlug: string,
  ): Promise<readonly Collision[]> {
    const collisions = await this.detectCollisions(guildId, moduleSlug);
    const resolved: Collision[] = [];
    for (const c of collisions) {
      const existingOverride = await this.deps.getOverride(guildId, c.commandKey);
      if (!existingOverride) {
        resolved.push(c);
      }
    }
    return resolved;
  }

  async handleModuleDisable(guildId: string, disabledModuleSlug: string): Promise<void> {
    const overrides = await this.getAllOverridesForModule(guildId, disabledModuleSlug);
    for (const ov of overrides) {
      await this.deps.deleteOverride(guildId, ov.commandKey);
    }
  }

  private async getAllOverridesForModule(
    _guildId: string,
    _moduleSlug: string,
  ): Promise<readonly ResolvedOverride[]> {
    return [];
  }
}
