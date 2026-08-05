import type { CommandDeployer } from './CommandDeployer.js';
import type {
  CommandChangeQueueRepositoryPort,
  DistributedLockPort,
  EventBusPort,
  LoggerPort,
  MetricsPort,
  TracerPort,
} from './ports.js';

export class GuildCommandChangeScheduler {
  constructor(
    private readonly repository: CommandChangeQueueRepositoryPort,
    private readonly deployer: CommandDeployer,
    private readonly lock: DistributedLockPort,
    private readonly logger: LoggerPort,
    private readonly events?: EventBusPort,
    private readonly metrics?: MetricsPort,
    private readonly tracer?: TracerPort,
  ) {}

  async runDue(now = new Date()): Promise<void> {
    await this.lock.withLock('guild-command-change-scheduler', 60_000, async () => {
      const batches = await this.repository.findDueBatches(now);
      for (const batch of batches) {
        const span = this.tracer?.startSpan('command.change_queue.push');
        try {
          for (const entry of batch) {
            await this.repository.update({ ...entry, status: 'pushing', updatedAt: now });
          }
          await this.deployer.deployAll();
          for (const entry of batch) {
            await this.repository.update({ ...entry, status: 'pushed', updatedAt: now });
          }
          this.events?.emit('guild.command.change.pushed', {
            guildId: batch[0]?.guildId ?? '',
            identityId: batch[0]?.identityId ?? null,
            ids: batch.map((entry) => entry.id),
          });
          this.metrics?.increment('dumby_command_change_queue_push_total', { status: 'pushed' });
        } catch (error) {
          span?.recordException(error);
          const reason = error instanceof Error ? error.message : String(error);
          for (const entry of batch) {
            await this.repository.update({
              ...entry,
              status: 'failed',
              failureReason: reason,
              updatedAt: now,
            });
          }
          this.events?.emit('guild.command.change.failed', {
            guildId: batch[0]?.guildId ?? '',
            identityId: batch[0]?.identityId ?? null,
            ids: batch.map((entry) => entry.id),
            reason,
          });
          this.metrics?.increment('dumby_command_change_queue_push_total', { status: 'failed' });
          this.logger.error('guild-command-change-push-failed', { reason });
        } finally {
          span?.end();
        }
      }
    });
  }
}
