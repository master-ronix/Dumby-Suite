/**
 * UR-20261012-043 (A2.1) — the interaction handler a hosted persona runs.
 *
 * system-map §11: "A Persona is not a lighter bot — it is the framework running again under a
 * different identity." So a persona must dispatch exactly as the main bot does, through the SAME
 * adapters (UR-20261012-043) and the same component registry. Before this, a persona was online with
 * its commands registered and still silent when one of its own buttons was pressed, because the only
 * dispatch path lived inside the main bot's boot closure.
 *
 * This is that path, lifted out: build the adapter, hand it to the registry, log an unhandled
 * control. Nothing here reads configuration or closes over a client, so it runs identically for the
 * main bot and for every hosted persona.
 */
import {
  toComponentInteraction,
  type RawInteractionLike,
} from '../interactions/interaction-adapters.js';
import type { InteractionRegistry } from '../interactions/interaction-registry.js';
import type { Logger } from '../logging/logger.js';

/** The slice of a raw interaction the handler inspects to decide whether it is a control. */
export interface DispatchedInteractionLike extends RawInteractionLike {
  isButton?(): boolean;
  isStringSelectMenu?(): boolean;
}

export interface PersonaInteractionHandlerDeps {
  readonly registry: InteractionRegistry;
  readonly logger: Logger;
}

/**
 * Builds the `interactionCreate` handler for one identity. Returns a function that never throws: an
 * unhandled or failing control is logged and swallowed, because one bad button must not take the
 * gateway listener down.
 */
export function buildComponentInteractionHandler(
  deps: PersonaInteractionHandlerDeps,
): (interaction: unknown) => Promise<void> {
  return async (raw: unknown) => {
    const interaction = raw as DispatchedInteractionLike;
    const isControl =
      interaction.isButton?.() === true || interaction.isStringSelectMenu?.() === true;
    if (!isControl) return;
    try {
      const handled = await deps.registry.dispatch(toComponentInteraction(interaction));
      if (!handled) {
        deps.logger.warn(
          `unhandled-component-interaction customId=${interaction.customId ?? ''} userId=${interaction.user?.id ?? ''}`,
        );
      }
    } catch (err) {
      deps.logger.warn(
        `component-interaction-failed customId=${interaction.customId ?? ''} reason=${String(err)}`,
      );
    }
  };
}
