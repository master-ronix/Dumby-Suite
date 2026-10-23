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
import { CommandRegistry, type CommandProfile } from '../commands/command-registry.js';
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
  /** UR-20261012-081 — the presence to apply once logged in; absent means "leave it alone". */
  readonly presenceStatus?: string;
  /** UR-20261012-081 — the status quote shown beside the bot's name. */
  readonly note?: string;
  /**
   * item 1 — the persona's declared accent, so her router renders with HER colour as the fallback.
   * Absent means the neutral persona gray (the renderer's default for a persona).
   */
  readonly accent?: string;
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
  /**
   * UR-20261012-081 — apply the bot's Discord presence. Optional so a test double need not implement
   * it; absent, a persona simply keeps Discord's default presence.
   */
  setPresence?(presence: { status: string; note?: string }): unknown;
  /**
   * The fields /health reports for THIS profile. Optional, because they are the discord.js surface and
   * a test double need not carry it — but a real client has them, and the health page must read the
   * profile's own gateway, not the host's.
   */
  isReady?(): boolean;
  ws?: { ping: number };
  guilds?: {
    cache: {
      size: number;
      reduce(fn: (sum: number, guild: { memberCount: number }) => number, init: number): number;
    };
    /** The AUTHORITY on membership; the cache is a snapshot that can lag. */
    fetch?(): Promise<unknown>;
  };
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
  /**
   * Builds a registry containing ONLY those modules' commands.
   *
   * The profile is the persona's own, so the filtered registry is tagged for the application that
   * will run it — a persona is not the main bot, and a registry built for one must not be reused by
   * the other.
   */
  buildRegistry: (moduleSlugs: readonly string[], profile: CommandProfile) => CommandRegistry;
  /** Creates a client for a persona's token. */
  createClient: () => PersonaClient;
  /**
   * UR-20261012-057 — runs once the persona's client is logged in, so the framework icon set can be
   * registered on the PERSONA'S OWN application. An emoji belongs to one application and a message may
   * only reference an emoji its own application owns, so without this a persona's pages embedded the
   * main bot's ids and every icon rendered as the literal `:dumby_browse:`.
   */
  ensureEmojis?: (persona: RuntimePersona, client: PersonaClient) => Promise<void>;
  /**
   * UR-20261012-083 — deregister a persona's commands from Discord, so a stopped persona stops being
   * offered. Optional: without it a stopped persona goes offline but its commands linger.
   */
  clearCommands?: (persona: RuntimePersona, botToken: string) => Promise<number>;
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
  /**
   * item 2 (follow-up) — run this persona's OWN BCCM batch push, so a rename she queued through
   * `/queue` (written to HER application scope) actually reaches Discord. Without it her queued
   * cosmetics sit `pending` forever — the main bot's push deliberately ignores her scope.
   */
  runBccmPush?: (persona: RuntimePersona, botToken: string) => Promise<void>;
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
/**
 * UR-20261012-058 — a persona registers the SAME SPLIT the main bot does.
 *
 * `command-deployer.ts` is the authority: CORE commands are registered GLOBALLY and
 * standard/marketplace commands are registered PER GUILD. Each command lands in EXACTLY ONE scope, so
 * nothing is duplicated, and a core command works in DMs and in any guild the bot is in.
 *
 * Two earlier attempts got this wrong in opposite directions: UR-055 wrote the same payload to BOTH
 * routes (every command twice), and UR-056 over-corrected to the guild ONLY — which left a persona with
 * no global core commands, so `/health` and friends did nothing in a DM or in any other guild.
 *
 * A persona is bound to one guild, so its guild-scoped set goes to that guild. The `admin` tier is
 * EXCLUDED: admin commands belong to the framework's own operator surface, not to a persona.
 */
export function splitPersonaPayloads(registry: CommandRegistry): {
  global: readonly unknown[];
  guild: readonly unknown[];
} {
  const global: unknown[] = [];
  const guild: unknown[] = [];
  for (const def of registry.all()) {
    const tier = registry.getModuleTier(def.moduleId);
    if (tier === 'admin') continue;
    if (tier === 'core') global.push(def.data);
    else guild.push(def.data);
  }
  return { global, guild };
}

export async function deployPersonaCommands(
  applicationId: string,
  guildId: string,
  payloads: { readonly global: readonly unknown[]; readonly guild: readonly unknown[] },
  put: (route: string, body: readonly unknown[]) => Promise<unknown>,
): Promise<number> {
  // CLEAR both scopes first — a PUT is a bulk overwrite, so this is what retires a stale set — then
  // register each command in exactly ONE scope.
  await put(`/applications/${applicationId}/commands`, []);
  await put(`/applications/${applicationId}/guilds/${guildId}/commands`, []);
  if (payloads.global.length > 0) {
    await put(`/applications/${applicationId}/commands`, payloads.global);
  }
  if (payloads.guild.length > 0) {
    await put(`/applications/${applicationId}/guilds/${guildId}/commands`, payloads.guild);
  }
  return payloads.global.length + payloads.guild.length;
}

/**
 * §13 — the modules a persona's registry is built from: the CORE modules, which every profile shares,
 * plus the modules that persona holds.
 *
 * Both halves matter, and each was a failure on its own. The bindings ALONE left a persona with
 * nothing bound registering nothing — not even `/dashboard` — so a persona that owned no standard
 * module had no commands at all. The FULL registry left it registering modules claimed by another
 * profile, which it then refused at dispatch: a control a member can see but cannot use. Core plus
 * owned is the set that is both non-empty and entirely answerable.
 */
export function personaRegistryModules(
  coreSlugs: readonly string[],
  boundSlugs: readonly string[],
): readonly string[] {
  return [...new Set([...coreSlugs, ...boundSlugs])];
}

export function filterRegistryForModules(
  source: CommandRegistry,
  moduleIds: ReadonlySet<string>,
  /** item 2 — the profile the filtered registry serves (a persona's id + application). */
  profile?: CommandProfile,
): CommandRegistry {
  const out = new CommandRegistry(profile);
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
  /** What /health needs beyond the client: the registry she runs, and when she came up. */
  private readonly moduleSlugsOf = new Map<string, readonly string[]>();
  private readonly startedAt = new Map<string, number>();
  private readonly applicationOf = new Map<string, string>();

  constructor(private readonly deps: PersonaRuntimeDeps) {}

  /**
   * The runtime serving `applicationId`: her client, her registry, and when she started.
   *
   * /health must report the PROFILE's own numbers — her gateway, her modules, her guilds — and the
   * runtime is the only thing that holds them. Returns undefined for an application it does not host,
   * which the caller reads as "fall back to the host's view" rather than as an error.
   */
  runtimeFor(applicationId: string):
    | {
        client?: PersonaClient;
        moduleSlugs?: readonly string[];
        startedAt?: number;
      }
    | undefined {
    if (applicationId === '') return undefined;
    for (const [personaId, applicationIdOf] of this.applicationOf) {
      if (applicationIdOf !== applicationId) continue;
      const client = this.clients.get(personaId);
      const moduleSlugs = this.moduleSlugsOf.get(personaId);
      const startedAt = this.startedAt.get(personaId);
      return {
        ...(client !== undefined ? { client } : {}),
        ...(moduleSlugs !== undefined ? { moduleSlugs } : {}),
        ...(startedAt !== undefined ? { startedAt } : {}),
      };
    }
    return undefined;
  }

  /**
   * UR-20261012-085 — hosts personas, optionally only those matching `only`.
   *
   * The filter exists so ONE persona can be (re)started without disturbing the rest: `reloadPersona`
   * passes a single-id predicate. Without it, bringing a newly registered persona online meant a
   * process restart, because the runtime only ever read the table at boot.
   */
  async start(only?: (persona: RuntimePersona) => boolean): Promise<readonly PersonaStartResult[]> {
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
      if (only !== undefined && !only(persona)) continue;
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
        // The persona's OWN profile, and only the modules it holds: a module claimed by another
        // profile in this guild contributes no commands here. Deploying them anyway registered
        // commands the persona would then refuse — visible-but-dead, which reads as broken.
        const registry = this.deps.buildRegistry(moduleSlugs, {
          kind: 'persona',
          id: persona.id,
          applicationId: persona.discordApplicationId,
        });
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
        // UR-20261012-081 — apply the configured presence AFTER login, so `client.user` exists.
        // Non-fatal like the emoji upload: a presence that fails must not stop the persona.
        if (persona.presenceStatus !== undefined && client.setPresence !== undefined) {
          try {
            client.setPresence({
              status: persona.presenceStatus,
              ...(persona.note !== undefined ? { note: persona.note } : {}),
            });
            logger.info(
              `persona-presence-applied id=${persona.id} status=${persona.presenceStatus}` +
                (persona.note !== undefined ? ` note=${persona.note}` : ''),
            );
          } catch (err) {
            logger.warn(`persona-presence-failed id=${persona.id} reason=${String(err)}`);
          }
        }
        // item 2 (follow-up) — apply this persona's queued BCCM cosmetics on HER own application.
        // Non-fatal, like the emoji upload and presence: a failed push must not stop the persona.
        if (this.deps.runBccmPush !== undefined) {
          try {
            await this.deps.runBccmPush(persona, token);
          } catch (err) {
            logger.warn(`persona-bccm-push-failed id=${persona.id} reason=${String(err)}`);
          }
        }
        this.clients.set(persona.id, client);
        this.moduleSlugsOf.set(persona.id, moduleSlugs);
        this.startedAt.set(persona.id, Date.now());
        this.applicationOf.set(persona.id, persona.discordApplicationId);
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

  /**
   * UR-20261012-083 — stop ONE persona, now.
   *
   * Revoking soft-deletes the row, but the runtime still holds her client and Discord still holds
   * her commands: she keeps answering until the process restarts. A revoke that leaves the persona
   * working is not a revoke — the operator sees her online, with every command loaded, and concludes
   * the delete did nothing.
   *
   * Two halves, because they live in two places:
   * - the CLIENT is destroyed, which takes her offline;
   * - her COMMANDS are cleared. They are registered against her APPLICATION, not her session, so they
   *   outlive the client; left in place the picker offers commands that nothing will answer.
   *
   * Takes the persona's identity rather than looking it up, because by the time this runs the row is
   * already retired and a read filtered to active personas would not find her.
   *
   * Returns `true` when a running client was destroyed.
   */
  async stopPersona(persona: RuntimePersona): Promise<boolean> {
    const client = this.clients.get(persona.id);
    let stopped = false;
    if (client !== undefined) {
      try {
        await client.destroy();
        stopped = true;
      } catch (err) {
        this.deps.logger.warn(`persona-stop-failed id=${persona.id} reason=${String(err)}`);
      }
      this.clients.delete(persona.id);
      this.moduleSlugsOf.delete(persona.id);
      this.startedAt.delete(persona.id);
      this.applicationOf.delete(persona.id);
    }
    if (this.deps.clearCommands !== undefined) {
      try {
        const token = this.deps.openBotToken(persona.botTokenSealed);
        const cleared = await this.deps.clearCommands(persona, token);
        this.deps.logger.info(`persona-commands-cleared id=${persona.id} removed=${cleared}`);
      } catch (err) {
        // Non-fatal: a persona that is offline but still listed is a smaller problem than a stop
        // that throws and leaves her running.
        this.deps.logger.warn(
          `persona-commands-clear-failed id=${persona.id} reason=${String(err)}`,
        );
      }
    }
    this.deps.logger.info(
      `persona-stopped id=${persona.id} client=${stopped ? 'destroyed' : 'not-hosted'}`,
    );
    return stopped;
  }

  /**
   * UR-20261012-085 — reload ONE persona: stop her, then start her again from the CURRENT row.
   *
   * Registering a persona, binding a module to her, or rotating her credentials all change something
   * the runtime reads exactly once, at boot. So each of them used to need a process restart, and the
   * operator's experience was: do the thing, see nothing, restart. That is the same shape as the
   * revoke bug (UR-20261012-083) — a write that reaches the database and not the world.
   *
   * `stop` first, so her client is not doubled and her stale command set is cleared; then `start`
   * re-reads her row, so her bindings, status and token are whatever they are NOW rather than what
   * they were at the last boot. Her commands are re-deployed by the start path, so the clear is
   * transient.
   *
   * Returns the start result, or `undefined` when the row no longer matches (for example she was
   * revoked between the write and the reload) — an absent answer rather than a fabricated one.
   */
  async reloadPersona(persona: RuntimePersona): Promise<PersonaStartResult | undefined> {
    await this.stopPersona(persona);
    const results = await this.start((candidate) => candidate.id === persona.id);
    const result = results[0];
    if (result === undefined) {
      this.deps.logger.info(
        `persona-reload-skipped id=${persona.id} — no longer present or no longer active`,
      );
    } else {
      this.deps.logger.info(
        `persona-reloaded id=${persona.id} started=${result.started} commands=${result.commands}`,
      );
    }
    return result;
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
    this.moduleSlugsOf.clear();
    this.startedAt.clear();
    this.applicationOf.clear();
  }

  /** How many personas are currently hosted. */
  /**
   * UR-20261012-082 — re-apply a persona's presence to a RUNNING client.
   *
   * The boot path applies the presence once, at login. Without this, a presence set through Twill
   * would not reach Discord until the next restart — which reads to an operator as "the field does
   * nothing", the exact failure the presence work was meant to avoid. A stored value that is only
   * read at boot is indistinguishable from a value that is never read, until you restart.
   *
   * Returns `false` when the persona is not currently hosted (or its client cannot set a presence),
   * so a caller can tell "applied" from "nothing to apply it to" rather than assuming success.
   */
  applyPresence(personaId: string, presence: { status: string; note?: string }): boolean {
    const client = this.clients.get(personaId);
    if (client === undefined || client.setPresence === undefined) return false;
    try {
      client.setPresence(presence);
      this.deps.logger.info(
        `persona-presence-applied id=${personaId} status=${presence.status}` +
          (presence.note !== undefined ? ` note=${presence.note}` : ''),
      );
      return true;
    } catch (err) {
      // Non-fatal, exactly as at boot: a presence that fails must not stop the persona.
      this.deps.logger.warn(`persona-presence-failed id=${personaId} reason=${String(err)}`);
      return false;
    }
  }

  hostedCount(): number {
    return this.clients.size;
  }
}
