import { CORE_TOKENS } from '../../di/tokens.js';
import type { Container } from '../../di/container.js';
import type { CommandRegistry } from '../../commands/command-registry.js';
import { manifest } from './manifest.js';
import { modulesCommand } from './commands/modules.command.js';
import { handleModulesComponent } from './commands/modules.command.js';

export { manifest };

export function onLoad(container: Container): void {
  container.resolve<CommandRegistry>(CORE_TOKENS.CommandRegistry).register(modulesCommand);
}

export function onReady(): void {}

export function onUnload(): void {}

export { handleModulesComponent };