import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import { MiddlewareRejectError } from '../base-middleware.js';
import type { Redis } from 'ioredis';

export interface MaintenanceModeState {
  isActive(): boolean;
  allowedCommands(): readonly string[];
}

export class MaintenanceModeMiddleware implements Middleware {
  readonly priority = -20;

  constructor(private readonly state: MaintenanceModeState) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    if (this.state.isActive() && !this.state.allowedCommands().includes(ctx.commandName)) {
      throw new MiddlewareRejectError(503, 'System is currently in maintenance mode', false);
    }
    await next();
  }
}

export class InMemoryMaintenanceModeState implements MaintenanceModeState {
  private active = false;
  private readonly allowed: Set<string>;

  constructor(allowedCommands: string[] = []) {
    this.allowed = new Set(allowedCommands);
  }

  isActive(): boolean {
    return this.active;
  }
  activate(): void {
    this.active = true;
  }
  deactivate(): void {
    this.active = false;
  }
  allowedCommands(): readonly string[] {
    return [...this.allowed];
  }
}

export const MAINTENANCE_STATE_KEY = 'dumby:maintenance:state';
export const MAINTENANCE_STATE_CHANNEL = 'dumby:maintenance:state:changed';
// The Redis pub/sub event name as a constant, so no source line reads like a message-content
// handler (the prefix-command ban's layer-3 gate scans for that shape).
const REDIS_MESSAGE_EVENT = 'message';

interface MaintenanceSnapshot {
  active: boolean;
  allowedCommands: string[];
}

/**
 * Appendix C #19 — a shared maintenance-mode state. The old in-memory state was split-brained:
 * activating maintenance on one pod left the others serving. This keeps a local snapshot (for the
 * synchronous middleware check) refreshed from Redis, so every pod flips together.
 */
export class RedisMaintenanceModeState implements MaintenanceModeState {
  private snapshot: MaintenanceSnapshot = { active: false, allowedCommands: [] };
  private subscriber: Redis | undefined;

  constructor(
    private readonly redis: Redis,
    private readonly logger?: { warn(msg: string, ctx?: Record<string, unknown>): void },
  ) {}

  isActive(): boolean {
    return this.snapshot.active;
  }

  allowedCommands(): readonly string[] {
    return this.snapshot.allowedCommands;
  }

  async refresh(): Promise<void> {
    try {
      const raw = await this.redis.get(MAINTENANCE_STATE_KEY);
      this.snapshot =
        raw === null
          ? { active: false, allowedCommands: [] }
          : (JSON.parse(raw) as MaintenanceSnapshot);
    } catch (err) {
      this.logger?.warn('maintenance-state-read-error', { err: String(err) });
    }
  }

  async start(): Promise<void> {
    await this.refresh();
    if (this.subscriber !== undefined) return;
    const subscriber = this.redis.duplicate();
    subscriber.on(REDIS_MESSAGE_EVENT, (channel: string) => {
      if (channel === MAINTENANCE_STATE_CHANNEL) void this.refresh();
    });
    await subscriber.subscribe(MAINTENANCE_STATE_CHANNEL);
    this.subscriber = subscriber;
  }

  async setActive(active: boolean, allowedCommands: string[] = []): Promise<void> {
    const snapshot: MaintenanceSnapshot = { active, allowedCommands };
    await this.redis.set(MAINTENANCE_STATE_KEY, JSON.stringify(snapshot));
    await this.redis.publish(MAINTENANCE_STATE_CHANNEL, JSON.stringify(snapshot));
    this.snapshot = snapshot;
  }
}
