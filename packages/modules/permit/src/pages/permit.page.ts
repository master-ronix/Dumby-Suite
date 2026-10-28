import { definePage, type ModulePageContext, type ModulePageReadModel } from '@workspace/swastik';

/**
 * UR-20261027-106 — the permit module owns its page.
 *
 * This composition used to live in `apps/main/src/rendering/page-data.ts` (`permit()`): step 1 of the
 * grant-access flow, listing every command that can be granted, grouped by the module that declares
 * it, each with that module's own icon.
 *
 * The precedence rule the page states is the framework's, not this module's invention — role > group >
 * set, most-specific-wins, never overriding Layers 1–3, the bot-capability check or the RESTRICTED
 * floor — and it is stated here because this is where an operator starts the flow and needs to know
 * what they are about to change.
 */
export interface PermitPageData {
  title: string;
  lines: string[];
}

export const permitPage = definePage({
  id: 'permit',

  async render(_context: ModulePageContext, read: ModulePageReadModel): Promise<PermitPageData> {
    const lines: string[] = ['Choose a module command to manage grant access:', ''];

    for (const module of await read.list()) {
      const icon = await read.moduleIcon(module.iconName);
      for (const command of module.commands) {
        lines.push(`${icon} /${command.name}   ${module.slug} — ${command.description}`);
      }
    }

    lines.push(
      '',
      '§8.4 — grants resolve role > group > set, most-specific-wins, and never override Layers 1–3,',
      'the bot-capability check, or the RESTRICTED floor. Layer 6 ranks are evaluated, never written.',
    );

    return { title: 'Grant Access — Step 1: Select Command', lines };
  },
});
