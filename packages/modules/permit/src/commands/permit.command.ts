import { defineCommand } from '@workspace/swastik';

/**
 * interface.md — the `/permit` command is authored as a declared schema plus a
 * data-returning handler. The Renderer derives the entire presentation; the module never
 * constructs components, embeds or flags.
 */
export const permitCommand = defineCommand({
  name: 'permit',
  description: 'Manage guild-side grants — permits, whitelists, blacklists, cooldowns, and rate limits.',
  pages: ['permit'],
  options: [
    { name: 'grant', description: 'Manage permit grants for a command, for roles, groups or sets', type: 3 },
    { name: 'whitelist', description: 'Add a user or role to the whitelist for a command', type: 3 },
    { name: 'blacklist', description: 'Add a user or role to the command-scoped blacklist', type: 3 },
    { name: 'cooldown', description: 'Set cooldown duration and scope for a command', type: 3 },
    { name: 'rate-limit', description: 'Set rate limits for a command', type: 3 },
  ],
  execute: (_interaction, _context) => ({
    page: 'permit',
    data: {
      report: 'Layer 7 - guild-side grants',
      layer: 'Layer 7', note: 'Layer 6 ranks are evaluated, never written',
    },
  }),
});
