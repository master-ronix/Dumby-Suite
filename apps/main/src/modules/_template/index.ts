/**
 * Module template lifecycle hooks — minimal stubs showing the required
 * export shape. Copy this file into your new module directory and fill in.
 *
 * This module is NEVER registered in the bootstrap (register-all.ts does
 * not import it). It exists only as a reference and scaffold base.
 */
import type { Container } from '../../di/container.js';

export function onLoad(_container: Container): void {
  // Register your module's services and repositories into the DI container here.
  // Example:
  //   container.register(MyModuleTokens.Service, (c) => new MyService(c.resolve(CORE_TOKENS.Db).knex));
}

export async function onReady(_container: Container): Promise<void> {
  // Called after discord.js client is ready. Wire up gateway event listeners here.
  // Example:
  //   const client = container.resolve(CORE_TOKENS.DiscordClient);
  //   client.on('guildMemberAdd', handler);
}

export async function onUnload(): Promise<void> {
  // Release any held resources (open connections, timers, subscriptions).
}
