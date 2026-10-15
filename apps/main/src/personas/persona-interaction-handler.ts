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
  toCommandInteraction,
  toComponentInteraction,
  type RawInteractionLike,
} from '../interactions/interaction-adapters.js';
import type { CommandInteraction } from '../commands/command-router.js';
import type { InteractionRegistry } from '../interactions/interaction-registry.js';
import type { Logger } from '../logging/logger.js';

/** The slice of a raw interaction the handler inspects to decide what it is. */
export interface DispatchedInteractionLike extends RawInteractionLike {
  isButton?(): boolean;
  isStringSelectMenu?(): boolean;
  isChatInputCommand?(): boolean;
}

/** The slice of a router this handler drives — so the wiring is testable without a real router. */
export interface CommandDispatchLike {
  dispatch(interaction: CommandInteraction): Promise<unknown>;
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

export interface PersonaInteractionHandlerDeps {
  /** The shared component registry — buttons and select menus. */
  readonly registry: InteractionRegistry;
  readonly logger: Logger;
  /**
   * UR-20261012-049 — builds THIS persona's command router. A thunk, and optional, for two reasons:
   * the router is built once per persona rather than per interaction, and a router that cannot be
   * constructed degrades that persona to components-only instead of stopping it from starting.
   */
  readonly createCommandRouter?: () => CommandDispatchLike;
}

/**
 * UR-20261012-049 — the FULL interaction handler for one identity.
 *
 * UR-20261012-043 extracted the component path, which left a persona answering its buttons and
 * silently ignoring its slash commands: `buildDiscordClient` attaches only `error` and `warn`, and the
 * runtime attached only the component handler, so a chat-input command reached nothing at all and
 * Discord showed "The application did not respond" after three seconds.
 *
 * A persona is "the framework running again" (system-map §11), so it dispatches commands exactly as
 * the main bot does — through the shared adapters and a router built over the persona's own filtered
 * registry, with `residentPersonaId` set so command ownership is enforced.
 *
 * Never throws: one bad interaction must not take a gateway listener down.
 */
export function buildPersonaInteractionHandler(
  deps: PersonaInteractionHandlerDeps,
): (interaction: unknown) => Promise<void> {
  const components = buildComponentInteractionHandler(deps);
  let router: CommandDispatchLike | undefined;
  let routerResolved = false;

  const resolveRouter = (): CommandDispatchLike | undefined => {
    if (routerResolved) return router;
    routerResolved = true;
    if (deps.createCommandRouter === undefined) return undefined;
    try {
      router = deps.createCommandRouter();
    } catch (err) {
      deps.logger.warn(`persona-command-router-failed reason=${String(err)}`);
      router = undefined;
    }
    return router;
  };

  return async (raw: unknown) => {
    const interaction = raw as DispatchedInteractionLike;
    if (interaction.isChatInputCommand?.() === true) {
      try {
        const resolved = resolveRouter();
        if (resolved === undefined) {
          deps.logger.warn(
            `persona-command-unhandled command=${interaction.commandName ?? ''} reason=no-router`,
          );
          return;
        }
        await resolved.dispatch(toCommandInteraction(interaction));
      } catch (err) {
        deps.logger.warn(
          `persona-command-dispatch-failed command=${interaction.commandName ?? ''} reason=${String(err)}`,
        );
      }
      return;
    }
    await components(interaction);
  };
}
