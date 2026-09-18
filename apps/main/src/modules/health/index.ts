import { CORE_TOKENS } from '../../di/tokens.js';
import type { Container } from '../../di/container.js';
import type { CommandRegistry } from '../../commands/command-registry.js';
import { manifest } from './manifest.js';
import { healthCommand } from './commands/health.command.js';
import { handleHealthComponent } from './commands/health.command.js';

export { manifest };

export function onLoad(container: Container): void {
  container.resolve<CommandRegistry>(CORE_TOKENS.CommandRegistry).register(healthCommand);
}

export function onReady(): void {}

export function onUnload(): void {}

export { handleHealthComponent };
