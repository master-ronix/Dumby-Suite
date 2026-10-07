import type { CommandInteraction, CommandRouter } from '../commands/command-router.js';
import type { RenderMode } from '../rendering/core-renderer.js';
import type { ComponentInteraction, InteractionRegistry } from './interaction-registry.js';

const MODE_PREFIX = 'dumby:mode:';
const NAV_PREFIX = 'dumby:nav:';

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
    reply: interaction.reply,
    deferReply: interaction.deferReply,
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

  registry.register({
    customIdPrefix: NAV_PREFIX,
    parse: (customId) => ({ page: customId.split(':')[3] }),
    execute: async (interaction, context) => {
      const { page } = context as { page?: string };
      const target = interaction.values?.[0] ?? page;
      if (target === undefined) return;
      await router.dispatch(asPageInteraction(interaction, target));
    },
  });
}
