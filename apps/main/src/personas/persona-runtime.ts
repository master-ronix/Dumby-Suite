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
 * UR-20261012-043 — a persona also answers its own IN-MESSAGE CONTROLS. The adapters and the component
 * dispatch that were entangled with the main bot's boot closure are now extracted
 * (`interactions/interaction-adapters.ts`, `personas/persona-interaction-handler.ts`), and the runtime
 * attaches that handler to every client it logs in, so a persona dispatches exactly as the main bot
 * does — the same adapters, the same registry contract, its own identity.
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
  /**
   * UR-20261012-043 — subscribes to the gateway. The runtime uses this for `interactionCreate`, so a
   * persona answers its own controls. Optional so a test double need not implement it.
   */
  on?(event: 'interactionCreate', handler: (interaction: unknown) => void): unknown;
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
  /**
   * UR-20261012-057 — runs once the persona's client is logged in, so the framework icon set can be
   * registered on the PERSONA'S OWN application. An emoji belongs to one application and a message may
   * only reference an emoji its own application owns, so without this a persona's pages embedded the
   * main bot's ids and every icon rendered as the literal `:dumby_browse:`.
   */
  ensureEmojis?: (persona: RuntimePersona, client: PersonaClient) => Promise<void>;
  /** Registers the registry's commands in the persona's bound guild, with the persona's own token. */
  deployCommands: (
    persona: RuntimePersona,
    botToken: string,
    registry: CommandRegistry,
  ) => Promise<number>;
  /**
   * UR-20261012-043 — the `interactionCreate` handler this persona runs, built from the shared
   * adapters and the persona's own registry. Omitted, the persona answers commands only.
   */
  createInteractionHandler?: (
    persona: RuntimePersona,
    registry: CommandRegistry,
  ) => (interaction: unknown) => void;
  logger: Logger;
}

/**
 * A registry containing only `moduleIds`' commands — the same tier bookkeeping as the source, so a
 * persona's router behaves exactly as the main bot's does for those modules.
 */
/**
 * UR-20261012-054 — the persona's command registration.
 *
 * GLOBAL and GUILD, and ALWAYS. Both PUTs are BULK OVERWRITES: the set sent replaces whatever was
 * registered, so a stale command left by an earlier state is cleared by the same call that installs the
 * new one. The previous form returned early on an empty payload, which is exactly why a persona with
 * nothing bound neither registered anything nor cleared what it had registered before.
 *
 * `put` is injected so the contract is testable without a live Discord call.
 */
export async function deployPersonaCommands(
  applicationId: string,
  guildId: string,
  payloads: readonly unknown[],
  put: (route: string, body: readonly unknown[]) => Promise<unknown>,
): Promise<number> {
  // UR-20261012-056 — mirror the main bot EXACTLY: clear both scopes, then register the set ONCE.
  //
  // UR-055 PUT the same payload to the global route AND the guild route, which registers every
  // command TWICE — Discord then lists each one as both a global and a this-server command. The main
  // bot never does this: `command-deployer.ts` clears the global set and the guild set, then registers
  // each command in EXACTLY ONE scope (development puts every tier in the development guild;
  // production puts core globally and the rest per guild).
  //
  // A persona is bound to one guild, so its case is the development case: clear both, register
  // everything to the bound guild. The clear is what retires a stale set, and registering once is what
  // prevents the duplicate.
  await put(`/applications/${applicationId}/commands`, []);
  await put(`/applications/${applicationId}/guilds/${guildId}/commands`, []);
  await put(`/applications/${applicationId}/guilds/${guildId}/commands`, payloads);
  return payloads.length;
}

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
    // UR-20261012-040 — this runs at boot, so a read failure is reported and yields an empty run
    // rather than propagating out of the start path.
    let personas: readonly RuntimePersona[];
    try {
      personas = await listPersonas();
    } catch (err) {
      logger.warn(`persona-runtime-list-failed reason=${String(err)}`);
      return [];
    }
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
        // UR-20261012-050 — WHY a persona has no commands is now REPORTED, not silent.
        //
        // A persona deploys only its bound modules, and the deploy returns early on an empty payload,
        // so "the persona registered no commands" had exactly one signal: `commands=0`. That does not
        // say whether nothing is bound or a bound slug simply matches no registered module — and a
        // binding for a slug that is not a module id contributes nothing, silently.
        const contributing = new Set(registry.all().map((def) => def.moduleId));
        const unmatched = moduleSlugs.filter((slug) => !contributing.has(slug));
        if (moduleSlugs.length === 0) {
          logger.warn(
            `persona-no-modules-bound id=${persona.id} — it OWNS nothing, so it will refuse every command it is not bound to; bind a module and restart`,
          );
        } else if (unmatched.length > 0) {
          logger.warn(
            `persona-bound-module-unregistered id=${persona.id} modules=${unmatched.join(',')} — bound but contributing no commands`,
          );
        }
        const client = this.deps.createClient();
        const deployed = await this.deps.deployCommands(persona, token, registry);
        // UR-20261012-043 — attach the dispatch path BEFORE login so no early interaction is missed.
        if (this.deps.createInteractionHandler !== undefined && client.on !== undefined) {
          client.on('interactionCreate', this.deps.createInteractionHandler(persona, registry));
        }
        await client.login(token);
        // UR-20261012-057 — after login, register the framework icons on this persona's application.
        // Non-fatal: a failure leaves the unicode fallback in place rather than stopping the persona.
        if (this.deps.ensureEmojis !== undefined) {
          try {
            await this.deps.ensureEmojis(persona, client);
          } catch (err) {
            logger.warn(`persona-emoji-upload-failed id=${persona.id} reason=${String(err)}`);
          }
        }
        this.clients.set(persona.id, client);
        results.push({
          personaId: persona.id,
          name: persona.name,
          started: true,
          commands: deployed,
        });
        // The log viewer drops structured fields, so the outcome is in the message too.
        logger.info(
          `persona-runtime-started id=${persona.id} guild=${persona.boundGuildId} bound=${moduleSlugs.length} commands=${deployed}`,
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
