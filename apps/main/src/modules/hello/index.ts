/**
 * Hello module lifecycle and command handler (Core tier).
 *
 * /hello reply format (interface.md §5.3 — ground truth):
 *   Hello, World!
 *
 * No name, no user mention, no timestamp, no additional line — ever.
 * Uses Discord Components V2 exclusively.
 */
import type { Container } from '../../di/container.js';
import { CORE_TOKENS } from '../../di/tokens.js';
import { HelloManifest } from './manifest.js';
import { IS_COMPONENTS_V2, ComponentType } from '../../shared/constants/index.js';

export { HelloManifest };

export function buildHelloReplyComponents(): unknown[] {
  return [
    {
      type: ComponentType.Container,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: 'Hello, World!',
        },
      ],
    },
  ];
}

export function onLoad(container: Container): void {
  const registry = container.tryResolve(CORE_TOKENS.CommandRegistry);
  if (!registry) return; // Mock adapter — no command registry available.

  registry.register({
    moduleId: HelloManifest.name,
    data: {
      name: 'hello',
      description: 'Says hello.',
    },
    execute: async (interaction: unknown) => {
      const i = interaction as {
        reply: (opts: { flags: number; components: unknown[] }) => Promise<void>;
      };
      await i.reply({
        flags: IS_COMPONENTS_V2,
        components: buildHelloReplyComponents(),
      });
    },
  });
}

export function onReady(): void {
  // No additional readiness work required.
}

export function onUnload(): void {
  // No held resources.
}
