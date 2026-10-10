import type { CommandInteraction, CommandRouter } from '../commands/command-router.js';
import type { RenderMode } from '../rendering/core-renderer.js';
import type { ComponentInteraction, InteractionRegistry } from './interaction-registry.js';

const MODE_PREFIX = 'dumby:mode:';
const NAV_PREFIX = 'dumby:nav:';
const ACT_PREFIX = 'dumby:act:';

const isRenderMode = (value: string | undefined): value is RenderMode =>
  value === 'D' || value === 'M' || value === 'C';

/**
 * §2.4 — a component interaction carries no commandName, so the handler presents it to the router as
 * an already-acknowledged command interaction. `replied: true` makes the router's buffer step edit
 * the existing navigation message rather than reply with a new one (§2.2).
 */
function asPageInteraction(
  interaction: ComponentInteraction,
  commandName: string,
): CommandInteraction {
  return {
    commandName,
    user: { id: interaction.user.id },
    guildId: interaction.guildId,
    // The registry has already acknowledged this component interaction with `deferUpdate`, so a
    // reply or defer here would be a second acknowledgement, which Discord rejects. Only `editReply`
    // should act, and it edits the navigation message in place (§2.2).
    reply: async () => {},
    deferReply: async () => {},
    editReply: interaction.editReply,
    replied: true,
    deferred: false,
  };
}

/**
 * §2.4 / §11.3 — the frame's own controls. Both re-enter the router for the target page, so mode
 * switching and dropdown navigation take the same edit-in-place path as any other page change.
 */
export function registerCoreFrameHandlers(deps: {
  registry: InteractionRegistry;
  router: CommandRouter;
}): void {
  const { registry, router } = deps;

  registry.register({
    customIdPrefix: MODE_PREFIX,
    parse: (customId) => {
      const parts = customId.split(':');
      return { mode: parts[3], page: parts[4] };
    },
    execute: async (interaction, context) => {
      const { mode, page } = context as { mode?: string; page?: string };
      if (!isRenderMode(mode) || page === undefined) return;
      await router.dispatch(asPageInteraction(interaction, page), { mode });
    },
  });

  // items 11/15/17 - page-declared action controls: paging re-enters the router; info and
  // uninstall re-render the page (edit-in-place), so the surface stays one message.
  registry.register({
    customIdPrefix: ACT_PREFIX,
    parse: (customId) => {
      const parts = customId.split(':');
      return { action: parts[3], target: parts[4] };
    },
    execute: async (interaction, context) => {
      const { action, target } = context as { action?: string; target?: string };
      if (action === undefined || target === undefined) return;
      if (action === 'next' || action === 'prev' || action === 'first' || action === 'search') {
        await router.dispatch(asPageInteraction(interaction, target));
        return;
      }
      if (action === 'info' || action === 'uninstall') {
        await router.dispatch(asPageInteraction(interaction, 'modules'));
      }
    },
  });

  registry.register({
    customIdPrefix: NAV_PREFIX,
    parse: (customId) => {
      const parts = customId.split(':');
      return { target: parts[3], page: parts[4] };
    },
    execute: async (interaction, context) => {
      const { target, page } = context as { target?: string; page?: string };
      if (target === undefined) return;
      // F-5 — numeric navigation (home / next / prev, and the legacy `page`) carries the target
      // page index in the fourth segment; any other target is a page name from the dropdown.
      if (target === 'home' || target === 'next' || target === 'prev' || target === 'page') {
        const n = target === 'home' ? 0 : Number(page);
        await router.dispatch(asPageInteraction(interaction, 'dashboard'), {
          page: Number.isFinite(n) ? n : 0,
        });
        return;
      }
      await router.dispatch(asPageInteraction(interaction, target));
    },
  });
}
