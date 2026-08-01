export const MAX_COMMANDS_PER_GUILD = 100;

export class CommandCeilingExceededError extends Error {
  readonly projected: number;
  readonly ceiling: number;

  constructor(projected: number, ceiling: number = MAX_COMMANDS_PER_GUILD) {
    super(
      `Command ceiling exceeded: ${projected} commands would be registered, ` +
        `but the maximum is ${ceiling}`,
    );
    this.name = 'CommandCeilingExceededError';
    this.projected = projected;
    this.ceiling = ceiling;
  }
}

export function isCommandCeilingError(err: unknown): err is CommandCeilingExceededError {
  return err instanceof CommandCeilingExceededError;
}

export interface CommandCeilingProjection {
  readonly current: number;
  readonly pendingAdditions: number;
  readonly pendingRemovals: number;
  readonly projected: number;
  readonly ceiling: number;
  readonly allowed: boolean;
}

export interface CommandCeilingDeps {
  getCurrentCommandCount: (guildId: string) => Promise<number> | number;
  getPendingAdditions: (guildId: string) => Promise<number> | number;
  getPendingRemovals: (guildId: string) => Promise<number> | number;
}

export class CommandCeilingService {
  constructor(private readonly deps: CommandCeilingDeps) {}

  async project(guildId: string): Promise<CommandCeilingProjection> {
    const current = await this.deps.getCurrentCommandCount(guildId);
    const pendingAdditions = await this.deps.getPendingAdditions(guildId);
    const pendingRemovals = await this.deps.getPendingRemovals(guildId);
    const projected = current + pendingAdditions - pendingRemovals;
    const ceiling = MAX_COMMANDS_PER_GUILD;
    return {
      current,
      pendingAdditions,
      pendingRemovals,
      projected,
      ceiling,
      allowed: projected <= ceiling,
    };
  }

  async guard(guildId: string): Promise<CommandCeilingProjection> {
    const projection = await this.project(guildId);
    if (!projection.allowed) {
      throw new CommandCeilingExceededError(projection.projected, projection.ceiling);
    }
    return projection;
  }
}
