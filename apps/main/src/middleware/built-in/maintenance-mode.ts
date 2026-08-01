/**
 * Priority -20: MaintenanceModeMiddleware (Cluster: Ring).
 * Short-circuits all interactions when maintenance mode is active,
 * except for commands on an allow-list that manage maintenance mode itself.
 */
import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import { MiddlewareRejectError } from '../base-middleware.js';

export interface MaintenanceModeState {
  isActive(): boolean;
  /** Commands exempt from the maintenance-mode gate (e.g. core-admin commands). */
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

/** In-memory maintenance-mode state for tests and the single-node case. */
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
