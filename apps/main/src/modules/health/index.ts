/**
 * Health module lifecycle and command handler (Core tier).
 *
 * /health reply format (interface.md §5.2 — ground truth):
 *   Ping: {ping}ms
 *   Latency: {latency}ms
 *
 * Uses Discord Components V2 exclusively:
 *   - Flag IS_COMPONENTS_V2 (1 << 15 = 32768)
 *   - One Container component (type 17) → one Text Display component (type 10)
 *   - No embeds, no content string, no buttons, no Action Rows — ever.
 */
import type { Container } from '../../di/container.js';
import { CORE_TOKENS } from '../../di/tokens.js';
import { HealthManifest } from './manifest.js';
import { IS_COMPONENTS_V2, ComponentType } from '../../shared/constants/index.js';

export { HealthManifest };

/** Shape of a discord.js ChatInputCommandInteraction (enough for our use). */
interface HealthInteraction {
  reply: (options: {
    flags: number;
    components: unknown[];
  }) => Promise<void>;
}

export function buildHealthReplyComponents(ping: number, latency: number): unknown[] {
  const pingText = ping >= 0 ? `${ping}ms` : 'unavailable';
  const latencyText = `${latency}ms`;
  return [
    {
      type: ComponentType.Container,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `Ping: ${pingText}\nLatency: ${latencyText}`,
        },
      ],
    },
  ];
}

export async function handleHealthCommand(
  interaction: HealthInteraction,
  wsping: number,
): Promise<void> {
  const start = Date.now();
  await interaction.reply({
    flags: IS_COMPONENTS_V2,
    components: buildHealthReplyComponents(wsping, Date.now() - start),
  });
}

export function onLoad(container: Container): void {
  const registry = container.tryResolve(CORE_TOKENS.CommandRegistry);
  if (!registry) return; // Mock adapter — no command registry available.

  registry.register({
    moduleId: HealthManifest.name,
    data: {
      name: 'health',
      description: 'Shows the bot\'s current ping and latency.',
    },
    execute: async (interaction: unknown) => {
      const i = interaction as {
        reply: (opts: { flags: number; components: unknown[] }) => Promise<void>;
        client?: { ws?: { ping: number } };
      };
      const wsping = i.client?.ws?.ping ?? -1;
      const start = Date.now();
      await i.reply({
        flags: IS_COMPONENTS_V2,
        components: buildHealthReplyComponents(wsping, Date.now() - start),
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
