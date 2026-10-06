import type { DbClient } from '../db/client.js';
import type { Logger } from '../logging/logger.js';

export interface ErasureResult {
  moduleSlug: string;
  tablesAffected: number;
  rowsDeleted: number;
}

export interface ModuleEraser {
  (db: DbClient, targetId: string, targetType: 'user' | 'guild'): Promise<number>;
}

export interface ErasureCoordinatorDeps {
  db: DbClient;
  logger: Logger;
  erasers: Map<string, ModuleEraser>;
}

export class ErasureCoordinator {
  constructor(private readonly deps: ErasureCoordinatorDeps) {}

  registerEraser(moduleSlug: string, eraser: ModuleEraser): void {
    this.deps.erasers.set(moduleSlug, eraser);
  }

  async eraseUser(userId: string): Promise<readonly ErasureResult[]> {
    return this.erase(userId, 'user');
  }

  async eraseGuild(guildId: string): Promise<readonly ErasureResult[]> {
    return this.erase(guildId, 'guild');
  }

  private async erase(
    targetId: string,
    targetType: 'user' | 'guild',
  ): Promise<readonly ErasureResult[]> {
    const results: ErasureResult[] = [];
    for (const [moduleSlug, eraser] of this.deps.erasers) {
      try {
        const rowsDeleted = await eraser(this.deps.db, targetId, targetType);
        results.push({ moduleSlug, tablesAffected: rowsDeleted > 0 ? 1 : 0, rowsDeleted });
        this.deps.logger.info('erasure-complete', {
          moduleSlug,
          targetType,
          targetId,
          rowsDeleted,
        });
      } catch (err) {
        this.deps.logger.error('erasure-failed', {
          moduleSlug,
          targetType,
          targetId,
          error: String(err),
        });
        results.push({ moduleSlug, tablesAffected: 0, rowsDeleted: 0 });
      }
    }
    await this.deps.db.knex('audit_logs').insert({
      source: 'ERASURE_COORDINATOR',
      actorId: 'SYSTEM',
      action: `erasure.${targetType}`,
      targetType,
      targetId,
      afterState: JSON.stringify({ results }),
      timestamp: new Date(),
    });
    return results;
  }
}
