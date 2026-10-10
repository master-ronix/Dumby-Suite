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
                processor: (jb) => Promise.resolve(job.process({ data: jb.data })),
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
                  handle: async (...args: unknown[]) => {
                    await handler.handle(...args);
                  },
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
              scheduler.register({
                name: task.name,
                cron: task.cron,
                execute: async () => {
                  await task.execute();
                },
              });
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
