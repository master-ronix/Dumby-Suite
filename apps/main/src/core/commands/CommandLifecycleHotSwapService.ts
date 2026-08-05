import { CommandRegistry } from './CommandRegistry.js';
import { CommandValidationService } from './CommandValidationService.js';
import type { CommandDeployer } from './CommandDeployer.js';
import type {
  AuditLogPort,
  EventBusPort,
  LoggerPort,
  MetricsPort,
  ModuleLifecyclePort,
  RegistryReferencePort,
  TracerPort,
} from './ports.js';
import type { HotSwapRequest, HotSwapResult, ModuleCommandDefinition } from './types.js';

export class CommandLifecycleHotSwapService {
  constructor(
    private readonly modules: ModuleLifecyclePort,
    private readonly registryRef: RegistryReferencePort,
    private readonly deployer: CommandDeployer,
    private readonly logger: LoggerPort,
    private readonly events?: EventBusPort,
    private readonly audit?: AuditLogPort,
    private readonly metrics?: MetricsPort,
    private readonly tracer?: TracerPort,
  ) {}

  async hotSwap(request: HotSwapRequest): Promise<HotSwapResult> {
    const span = this.tracer?.startSpan('command.hotswap.registry_replace', {
      moduleSlug: request.moduleSlug,
    });
    const previous = this.registryRef.get();
    try {
      await this.modules.unload(request.moduleSlug);
      await this.modules.load(request.moduleSlug);
      await this.modules.ready(request.moduleSlug);
      const moduleSets = await this.modules.collectLoadedModules();
      const definitions: ModuleCommandDefinition[] = moduleSets
        .filter((module) => module.enabled)
        .flatMap((module) =>
          module.commands.map((command) => ({
            moduleSlug: module.moduleSlug,
            tier: module.tier,
            command,
          })),
        );
      const next = CommandRegistry.buildFrozen(definitions, new CommandValidationService(), this.events, this.metrics);
      this.registryRef.replace(next);
      this.events?.emit('guild.command.registry.replaced', {
        previousSize: previous.size(),
        newSize: next.size(),
      });
      this.logger.info('command-hotswap-registry-replaced', {
        moduleSlug: request.moduleSlug,
        previousSize: previous.size(),
        newSize: next.size(),
      });
      await this.deployer.deployAll();
      this.events?.emit('guild.command.hotswap.succeeded', {
        moduleSlug: request.moduleSlug,
        previousSize: previous.size(),
        newSize: next.size(),
      });
      await this.audit?.write({
        source: 'COMMANDS',
        actorId: request.actorId,
        action: 'command_registry.hotswap_replaced',
        targetType: 'module',
        targetId: request.moduleSlug,
        beforeState: { size: previous.size() },
        afterState: { size: next.size() },
        reason: request.reason,
        timestamp: new Date(),
      });
      return { ok: true, previousRegistrySize: previous.size(), newRegistrySize: next.size() };
    } catch (error) {
      span?.recordException(error);
      const reason = error instanceof Error ? error.message : String(error);
      this.events?.emit('guild.command.hotswap.failed', { moduleSlug: request.moduleSlug, reason });
      this.logger.error('command-hotswap-failed', { moduleSlug: request.moduleSlug, reason });
      return { ok: false, previousRegistrySize: previous.size(), newRegistrySize: previous.size(), error };
    } finally {
      span?.end();
    }
  }
}
