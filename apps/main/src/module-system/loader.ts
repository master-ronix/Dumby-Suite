import type { Container } from '../di/container.js';
import type { Logger } from '../logging/logger.js';
import { topologicalLoadOrder, classifyLoadFailures, type ModuleNode } from './topo-sort.js';
import { resolveRegisteredDeveloper } from './developer-registry.js';
import { validateTierRules } from './tier-rules.js';
import { checkModuleAgainstPolicy, type SecurityPolicy } from './policy-lockfile.js';
import type { ModuleRegistry } from './registry.js';
import { CORE_TOKENS } from '../di/tokens.js';
import type { CommandRegistry } from '../commands/command-registry.js';
import { toCommandDefinition } from '../commands/module-command.js';
import type { CoreRenderer } from '../rendering/core-renderer.js';
import type { QueueManager } from '../queue/queue-manager.js';
import type { EventRouter } from '../events/event-router.js';
import type { Scheduler } from '../queue/scheduler.js';
import { runWithModuleContext } from '@workspace/swastik';
import type { ModuleContextResolver } from './execution-context.js';

/** The first guild id among an event's arguments (a Message, GuildMember, …). */
function guildIdFromArgs(args: readonly unknown[]): string | null {
  for (const arg of args) {
    if (typeof arg !== 'object' || arg === null) continue;
    const candidate = arg as { guildId?: unknown; guild?: { id?: unknown } };
    if (typeof candidate.guildId === 'string') return candidate.guildId;
    if (typeof candidate.guild?.id === 'string') return candidate.guild.id;
  }
  return null;
}

/** The guild a job belongs to, when its payload names one. */
function guildIdFromJobData(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const candidate = data as { guildId?: unknown; guild?: { id?: unknown } };
  if (typeof candidate.guildId === 'string') return candidate.guildId;
  if (typeof candidate.guild?.id === 'string') return candidate.guild.id;
  return null;
}

export interface ModuleLoadReport {
  order: readonly string[];
  fatal: readonly string[];
  degraded: readonly string[];
}

export interface ModuleReadyReport {
  failed: readonly string[];
  requiredFailed: readonly string[];
}

export class ModuleValidationFailedError extends Error {
  constructor(
    readonly moduleName: string,
    readonly violations: readonly string[],
  ) {
    super(`Module "${moduleName}" fails tier validation: ${violations.join('; ')}`);
    this.name = 'ModuleValidationFailedError';
  }
}

export class FatalModuleLoadError extends Error {
  constructor(readonly fatalModules: readonly string[]) {
    super(`Fatal (required:true) module load failure(s): ${fatalModules.join(', ')}`);
    this.name = 'FatalModuleLoadError';
  }
}

/**
 * §1.5 / §11.6 — the framework's own surfaces attribute to Quixotic Mnemonics at the framework
 * version; a module page attributes to its developer at the module's version. Every module here
 * is first-party (`dev_first_party`), so the developer resolves to the framework's, and only the
 * version differs: Core-tier surfaces take the framework's, everything else carries its own.
 */
const FRAMEWORK_DEVELOPER = 'Quixotic Mnemonics';
const FRAMEWORK_VERSION = '5.0.0';
const FIRST_PARTY_DEV_ID = 'dev_first_party';

export class ModuleLoader {
  constructor(
    private readonly registry: ModuleRegistry,
    private readonly container: Container,
    private readonly logger: Logger,
    private readonly policy?: SecurityPolicy,
  ) {}

  /**
   * UR-20261012-070 — the module execution-context resolver, for the three entry points that are not
   * a command. Set after construction because the application id it needs comes from the Discord
   * client, which is not ready when Stage 12 registers a module's handlers. Absent, the handlers run
   * exactly as before — no context, no change in behaviour.
   */
  private moduleContext: ModuleContextResolver | undefined;

  setModuleContextResolver(resolver: ModuleContextResolver): void {
    this.moduleContext = resolver;
  }

  /**
   * Run a piece of module work with its context attached. The resolver never throws (UR-20261012-068:
   * a context is advisory), so neither does this.
   */
  private async withModuleContext<T>(
    moduleId: string,
    guildId: string | null,
    source: 'event' | 'job' | 'task',
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const resolver = this.moduleContext;
    if (resolver === undefined) return await fn();
    const context = await resolver(moduleId, guildId, source);
    return await runWithModuleContext(context, fn);
  }

  validateAll(): void {
    for (const mod of this.registry.all()) {
      const tierViolations = validateTierRules({
        name: mod.manifest.name,
        tier: mod.manifest.tier,
        devGuildOnly: mod.manifest.devGuildOnly,
        marketplaceCategory: mod.manifest.marketplaceCategory,
        commands: mod.manifest.commands,
      }).map((v) => v.message);
      // D-7.5.5 — the Stage 11 security-policy lockfile check.
      const policyViolations =
        this.policy === undefined
          ? []
          : checkModuleAgainstPolicy(
              {
                name: mod.manifest.name,
                intents: mod.manifest.intents,
                commands: mod.manifest.commands,
              },
              this.policy,
            );
      const violations = [...tierViolations, ...policyViolations];
      if (violations.length > 0) {
        throw new ModuleValidationFailedError(mod.manifest.name, violations);
      }
    }
  }

  private nodes(): ModuleNode[] {
    return this.registry.all().map((m) => ({
      name: m.manifest.name,
      version: m.manifest.version,
      depends: m.manifest.depends,
      provides: m.manifest.provides,
      required: m.manifest.required,
    }));
  }

  async loadAll(): Promise<ModuleLoadReport> {
    const nodes = this.nodes();
    const order = topologicalLoadOrder(nodes);

    const failed: string[] = [];
    for (const name of order) {
      const mod = this.registry.get(name);
      if (!mod) continue;
      try {
        const commandRegistry = this.container.tryResolve<CommandRegistry>(
          CORE_TOKENS.CommandRegistry,
        );
        commandRegistry?.registerModule(mod.manifest.name, mod.manifest.tier);
        // §1.7 (UR-11) — register the module's schema-declared commands against the Renderer.
        if (commandRegistry !== undefined && mod.commands !== undefined) {
          const renderer = this.container.tryResolve<CoreRenderer>(CORE_TOKENS.Renderer);
          if (renderer !== undefined) {
            for (const declaration of mod.commands) {
              commandRegistry.register(
                toCommandDefinition(declaration, {
                  moduleId: mod.manifest.name,
                  identity: {
                    surface: `Dumby Suite | ${mod.manifest.name}`,
                    buildId: mod.manifest.buildId,
                    devUsername:
                      mod.manifest.ui?.devUsername ??
                      resolveRegisteredDeveloper(mod.manifest.devId) ??
                      mod.manifest.devId,
                    ...(mod.manifest.ui?.displayName !== undefined
                      ? { displayName: mod.manifest.ui.displayName }
                      : {}),
                    ...(mod.manifest.ui?.accent !== undefined
                      ? { accent: mod.manifest.ui.accent }
                      : {}),
                    ...(mod.manifest.ui?.banner !== undefined
                      ? { banner: mod.manifest.ui.banner }
                      : {}),
                    developer:
                      mod.manifest.devId === undefined || mod.manifest.devId === FIRST_PARTY_DEV_ID
                        ? FRAMEWORK_DEVELOPER
                        : mod.manifest.devId,
                    version:
                      mod.manifest.tier === 'core' ? FRAMEWORK_VERSION : mod.manifest.version,
                  },
                  renderer,
                  config: mod.manifest.config,
                }),
              );
            }
          }
        }
        // §5.9 — register the module's declared job queues against the queue manager.
        if (mod.jobs !== undefined) {
          const queueManager = this.container.tryResolve<QueueManager>(CORE_TOKENS.Queue);
          if (queueManager !== undefined) {
            for (const job of mod.jobs) {
              queueManager.registerQueue({
                name: job.queueName,
                // UR-20261012-069 — the owner travels with the queue, so a per-guild disable stops it.
                moduleId: mod.manifest.name,
                // UR-20261012-070 — the job runs inside the module's execution context.
                processor: (jb) =>
                  this.withModuleContext(
                    mod.manifest.name,
                    guildIdFromJobData(jb.data),
                    'job',
                    () => Promise.resolve(job.process({ data: jb.data })),
                  ),
              });
            }
          }
        }
        // §15.1 — register the module's gateway event handlers with the event router.
        if (mod.events !== undefined) {
          const eventRouter = this.container.tryResolve<EventRouter>(CORE_TOKENS.EventRouter);
          if (eventRouter !== undefined) {
            for (const handler of mod.events) {
              eventRouter.register(
                {
                  event: handler.event as never,
                  ...(handler.once !== undefined ? { once: handler.once } : {}),
                  ...(handler.sheddable !== undefined ? { sheddable: handler.sheddable } : {}),
                  // UR-20261012-070 — the handler runs inside the module's execution context, so a
                  // module can ask which profile is answering and where, exactly as a command can.
                  handle: async (...args: unknown[]) =>
                    this.withModuleContext(mod.manifest.name, guildIdFromArgs(args), 'event', () =>
                      Promise.resolve(handler.handle(...args)),
                    ),
                },
                mod.manifest.name,
              );
            }
          }
        }
        // §29.6 — register the module's cron tasks with the scheduler.
        if (mod.tasks !== undefined) {
          const scheduler = this.container.tryResolve<Scheduler>(CORE_TOKENS.Scheduler);
          if (scheduler !== undefined) {
            for (const task of mod.tasks) {
              scheduler.register(
                {
                  name: task.name,
                  cron: task.cron,
                  // UR-20261012-070 — a task has no guild, so its context carries guildId null.
                  execute: async () =>
                    this.withModuleContext(mod.manifest.name, null, 'task', () =>
                      Promise.resolve(task.execute()),
                    ),
                },
                // UR-20261012-069 — the owner travels with the task, so a disabled module's cron stops.
                mod.manifest.name,
              );
            }
          }
        }
        await mod.onLoad?.(this.container);
      } catch (err) {
        this.logger.error('module-load-failed', { module: name, error: String(err) });
        failed.push(name);
      }
    }

    const { fatal, degraded } = classifyLoadFailures(nodes, failed);
    if (fatal.length > 0) {
      throw new FatalModuleLoadError(fatal);
    }
    return { order, fatal, degraded };
  }

  async readyAll(order: readonly string[]): Promise<ModuleReadyReport> {
    const readyFailures: string[] = [];
    for (const name of order) {
      const mod = this.registry.get(name);
      if (!mod) continue;
      try {
        await mod.onReady?.(this.container);
      } catch (err) {
        this.logger.error('module-ready-failed-non-fatal', { module: name, error: String(err) });
        readyFailures.push(name);
      }
    }
    return {
      failed: readyFailures,
      requiredFailed: readyFailures.filter((name) => this.registry.get(name)?.manifest.required),
    };
  }

  async unloadAll(order: readonly string[]): Promise<void> {
    for (const name of [...order].reverse()) {
      const mod = this.registry.get(name);
      if (!mod) continue;
      try {
        await mod.onUnload?.();
      } catch (err) {
        this.logger.error('module-unload-failed', { module: name, error: String(err) });
      }
    }
  }
}
