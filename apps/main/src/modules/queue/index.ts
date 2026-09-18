import { CORE_TOKENS } from '../../di/tokens.js';
import type { Container } from '../../di/container.js';
import type { CommandRegistry } from '../../commands/command-registry.js';
import { manifest } from './manifest.js';
import { queueCommand } from './commands/queue.command.js';
import { handleQueueComponent } from './commands/queue.command.js';

export { manifest };

export function onLoad(container: Container): void {
  container.resolve<CommandRegistry>(CORE_TOKENS.CommandRegistry).register(queueCommand);
}

export function onReady(): void {}

export function onUnload(): void {}

export { handleQueueComponent };