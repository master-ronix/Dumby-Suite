import type { ModulePage } from '@workspace/swastik';
import type { Logger } from '../logging/logger.js';

/**
 * UR-20261027-106 — the page registry.
 *
 * A module declares `pages`; the loader registers them here; `rendering/page-data.ts` consults this
 * registry BEFORE its built-in switch. That is the whole mechanism that lets a module own its page:
 * the host stops being the author of a module's surface and becomes the dispatcher to it.
 *
 * Registry-first is deliberate: a module that declares a page wins over the host's copy of the same
 * id, so a page can be moved out of the core base one module at a time without a flag day.
 */
export interface RegisteredPage {
  readonly id: string;
  readonly moduleId: string;
  readonly page: ModulePage;
}

export class PageRegistry {
  private readonly pages = new Map<string, RegisteredPage>();

  constructor(private readonly logger?: Logger) {}

  register(moduleId: string, page: ModulePage): void {
    const existing = this.pages.get(page.id);
    if (existing !== undefined) {
      // Two modules claiming one page id is an ambiguity the renderer cannot resolve, and silently
      // keeping the last one would make the outcome depend on load order.
      this.logger?.warn('page-registry-duplicate', {
        pageId: page.id,
        kept: existing.moduleId,
        ignored: moduleId,
      });
      return;
    }
    this.pages.set(page.id, { id: page.id, moduleId, page });
  }

  get(pageId: string): RegisteredPage | undefined {
    return this.pages.get(pageId);
  }

  has(pageId: string): boolean {
    return this.pages.has(pageId);
  }

  /** The page ids a module currently owns — the list the host deletes from its switch as it moves. */
  ownedBy(moduleId: string): string[] {
    return [...this.pages.values()]
      .filter((entry) => entry.moduleId === moduleId)
      .map((entry) => entry.id)
      .sort();
  }

  ids(): string[] {
    return [...this.pages.keys()].sort();
  }
}
