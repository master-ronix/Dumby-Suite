import { Client, GatewayIntentBits, Partials, type ClientOptions } from 'discord.js';
import type { Logger } from '../logging/logger.js';
import { ConfigurationError } from '../errors/taxonomy.js';

const PRIVILEGED_INTENTS = new Set(['MessageContent', 'GuildMembers', 'GuildPresences']);

export function computeIntentsBitfield(moduleIntents: string[][]): number {
  let bits = 0;
  for (const intentList of moduleIntents) {
    for (const intent of intentList) {
      if (PRIVILEGED_INTENTS.has(intent)) {
        throw new ConfigurationError(
          `Module requested privileged gateway intent "${intent}"; ` +
            'enable it in the explicit operator config instead of the module manifest',
          { intent },
        );
      }
      const bit = (GatewayIntentBits as unknown as Record<string, number | undefined>)[intent];
      if (bit !== undefined) {
        bits |= bit;
      }
    }
  }
  bits |= GatewayIntentBits.Guilds;
  return bits;
}

export function computePartials(modulePartials: string[][]): Partials[] {
  const partialNames = new Set(modulePartials.flat());
  const result: Partials[] = [];
  for (const name of partialNames) {
    const val = (Partials as unknown as Record<string, number | undefined>)[name];
    if (val !== undefined) {
      result.push(val as Partials);
    }
  }
  return result;
}

export interface BuildClientOptions {
  intents: number;
  partials: Partials[];
  logger: Logger;
}

export function buildDiscordClient(options: BuildClientOptions): Client {
  const clientOptions: ClientOptions = {
    intents: options.intents,
    partials: options.partials,
  };

  const client = new Client(clientOptions);

  // The log viewer does not always surface a log's structured fields, so the message string carries
  // the text directly — the same workaround `command-execution-error` uses.
  client.on('error', (err) => {
    options.logger.error(`discord-client-error: ${String(err)}`, { error: String(err) });
  });

  client.on('warn', (msg) => {
    options.logger.warn(`discord-client-warn: ${msg}`, { message: msg });
  });

  return client;
}
