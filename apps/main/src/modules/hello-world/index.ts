import { CORE_TOKENS } from '../../di/tokens.js';
import type { Container } from '../../di/container.js';
import type { CommandRegistry } from '../../commands/command-registry.js';
import { manifest } from './manifest.js';
import { helloCommand } from './commands/hello.command.js';

export { manifest };

export function onLoad(container: Container): void {
  container.resolve<CommandRegistry>(CORE_TOKENS.CommandRegistry).register(helloCommand);
}

export function onReady(): void {}

export function onUnload(): void {}
