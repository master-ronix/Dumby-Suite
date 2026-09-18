import { CORE_TOKENS } from '../../di/tokens.js';
import type { Container } from '../../di/container.js';
import type { CommandRegistry } from '../../commands/command-registry.js';
import { manifest } from './manifest.js';
import { dashboardCommand } from './commands/dashboard.command.js';
import { handleDashboardComponent } from './commands/dashboard.command.js';

export { manifest };

export function onLoad(container: Container): void {
  container.resolve<CommandRegistry>(CORE_TOKENS.CommandRegistry).register(dashboardCommand);
}

export function onReady(): void {}

export function onUnload(): void {}

export { handleDashboardComponent };