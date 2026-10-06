import { z } from 'zod';

/**
 * §23.3 — the per-guild configuration schema (CODE REFERENCE 23-B). Validated on every write and
 * deserialized against the same schema on every read. Unknown module sections are preserved
 * (`.passthrough()`) because modules own their own config keys under this document.
 *
 * `prefix` is a DISPLAY-ONLY convenience value, never a functional command prefix (Ban 1, §4).
 */
const snowflake = z.string().regex(/^\d{17,20}$/, 'must be a Discord snowflake');

export const guildConfigSchema = z
  .object({
    locale: z.string().min(2).default('en-US'),
    timezone: z.string().min(1).default('UTC'),
    prefix: z.string().max(5).optional(),
    moderation: z
      .object({
        logChannelId: snowflake.optional(),
        muteRoleId: snowflake.optional(),
      })
      .optional(),
    channelRestrictions: z
      .record(
        z.string(),
        z.object({
          mode: z.enum(['allow', 'deny']),
          channelIds: z.array(snowflake),
        }),
      )
      .optional(),
    premiumEnabled: z.boolean().default(false),
  })
  .passthrough();

export type GuildConfig = z.infer<typeof guildConfigSchema>;
