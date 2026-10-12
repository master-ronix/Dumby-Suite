/**
 * UR-20261012-038 — the persona runtime.
 *
 * A Twill-registered persona is a separate Discord application. Nothing hosted it, so an invited
 * persona was listed and invitable but never actually ONLINE — the gap the operator hit.
 *
 * This is the host. For every active persona it opens the persona's sealed bot token, builds a
 * command registry containing ONLY the modules bound to that persona, registers those commands in the
 * persona's bound guild, and logs the persona's client in. The seams are injected so the whole
 * lifecycle is unit-testable without a gateway.
 *
 * Scope note (recorded, not hidden): this makes a persona ONLINE and gives it a real command surface.
 * Its interactive page controls (the buttons and select menus the Renderer emits) are wired by the
 * main bot's bootstrap-local interaction handler, which is not extracted here — so a persona answers
 * its slash commands but its in-message controls are the next step.
 */
import { CommandRegistry } from '../commands/command-registry.js';
import type { Logger } from '../logging/logger.js';
import type { SealedEnvelope } from '../crypto/envelope.js';

/** One persona as the runtime needs it. */
export interface RuntimePersona {
  readonly id: string;
  readonly name: string;
  readonly discordApplicationId: string;
  readonly boundGuildId: string;
  readonly botTokenSealed: SealedEnvelope;
  readonly status: string;
}

/** The slice of a Discord client the runtime drives. */
export interface PersonaClient {
  /** discord.js resolves the token string; the runtime ignores the value. */
  login(token: string): Promise<unknown>;
  destroy(): Promise<unknown>;
}

/** The outcome for one persona, so a partial failure is reported rather than swallowed. */
export interface PersonaStartResult {
  readonly personaId: string;
  readonly name: string;
  readonly started: boolean;
  readonly commands: number;
  readonly reason?: string;
}

export interface PersonaRuntimeDeps {
  /** Every persona; the runtime filters to the active ones itself. */
  listPersonas: () => Promise<readonly RuntimePersona[]>;
  /** Opens a persona's sealed bot token. Throws when the envelope cannot be unwrapped. */
  openBotToken: (sealed: SealedEnvelope) => string;
  /** The module slugs bound to this persona in its guild. */
  modulesBoundTo: (personaId: string) => Promise<readonly string[]>;
  /** Builds a registry containing only those modules' commands. */
  buildRegistry: (moduleSlugs: readonly string[]) => CommandRegistry;
  /** Creates a client for a persona's token. */
  createClient: () => PersonaClient;
  /** Registers the registry's commands in the persona's bound guild, with the persona's own token. */
  deployCommands: (
    persona: RuntimePersona,
    botToken: string,
    registry: CommandRegistry,
  ) => Promise<number>;
  logger: Logger;
}

/**
 * A registry containing only `moduleIds`' commands — the same tier bookkeeping as the source, so a
 * persona's router behaves exactly as the main bot's does for those modules.
 */
export function filterRegistryForModules(
  source: CommandRegistry,
  moduleIds: ReadonlySet<string>,
): CommandRegistry {
  const out = new CommandRegistry();
  for (const def of source.all()) {
    if (!moduleIds.has(def.moduleId)) continue;
    const tier = source.getModuleTier(def.moduleId);
    if (tier === undefined) continue;
    // registerModule is idempotent per module; registering twice is harmless but wasteful.
    if (out.getModuleTier(def.moduleId) === undefined) out.registerModule(def.moduleId, tier);
    out.register(def);
  }
  return out;
}

/**
 * Hosts every active persona. `start()` never throws for one persona's failure — it records the
 * reason and carries on, because one broken token must not take the rest of the fleet down.
 */
export class PersonaRuntime {
  private readonly clients = new Map<string, PersonaClient>();

  constructor(private readonly deps: PersonaRuntimeDeps) {}

  async start(): Promise<readonly PersonaStartResult[]> {
    const { listPersonas, logger } = this.deps;
    const personas = await listPersonas();
    const results: PersonaStartResult[] = [];

    for (const persona of personas) {
      if (persona.status !== 'active') {
        results.push({
          personaId: persona.id,
          name: persona.name,
          started: false,
          commands: 0,
          reason: 'not-active',
        });
        continue;
      }
      try {
        const token = this.deps.openBotToken(persona.botTokenSealed);
        if (token === '') {
          results.push({
            personaId: persona.id,
            name: persona.name,
            started: false,
            commands: 0,
            reason: 'empty-bot-token',
          });
          continue;
        }
        const moduleSlugs = await this.deps.modulesBoundTo(persona.id);
        const registry = this.deps.buildRegistry(moduleSlugs);
        const client = this.deps.createClient();
        const deployed = await this.deps.deployCommands(persona, token, registry);
        await client.login(token);
        this.clients.set(persona.id, client);
        results.push({
          personaId: persona.id,
          name: persona.name,
          started: true,
          commands: deployed,
        });
        // The log viewer drops structured fields, so the outcome is in the message too.
        logger.info(
          `persona-runtime-started id=${persona.id} guild=${persona.boundGuildId} commands=${deployed}`,
        );
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        results.push({
          personaId: persona.id,
          name: persona.name,
          started: false,
          commands: 0,
          reason,
        });
        logger.warn(`persona-runtime-failed id=${persona.id} reason=${reason}`);
      }
    }
    return results;
  }

  /** Logs every hosted persona out. Idempotent, and one failure never blocks the others. */
  async stop(): Promise<void> {
    for (const [personaId, client] of this.clients) {
      try {
        await client.destroy();
      } catch (err) {
        this.deps.logger.warn(`persona-runtime-stop-failed id=${personaId} reason=${String(err)}`);
      }
    }
    this.clients.clear();
  }

  /** How many personas are currently hosted. */
  hostedCount(): number {
    return this.clients.size;
  }
}
