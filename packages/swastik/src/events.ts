import type { z } from 'zod';
import { eventCatalogEntrySchema } from './manifest-schema.js';

/**
 * §18 — the events-catalog declaration helpers. A module declares every event it emits (with a
 * payload schema) in its manifest `eventsCatalog`; the emit/subscribe surface is checked against
 * that catalog, so a module cannot emit an undeclared event.
 */
export type EventCatalogEntry = z.infer<typeof eventCatalogEntrySchema>;

export function defineEvent(
  name: string,
  description: string,
  payload: Record<string, unknown>,
): EventCatalogEntry {
  return eventCatalogEntrySchema.parse({ name, description, payload });
}

export class EventCatalogError extends Error {
  constructor(readonly missing: readonly string[]) {
    super(`eventsCatalog is missing entries for emitted events: ${missing.join(', ')}`);
    this.name = 'EventCatalogError';
  }
}

/** Every emitted event name must name a catalog entry (enforced at Stage 11 / module review). */
export function assertCatalogCoversEvents(
  emittedEventNames: readonly string[],
  catalog: readonly EventCatalogEntry[],
): void {
  const declared = new Set(catalog.map((entry) => entry.name));
  const missing = emittedEventNames.filter((name) => !declared.has(name));
  if (missing.length > 0) throw new EventCatalogError(missing);
}
