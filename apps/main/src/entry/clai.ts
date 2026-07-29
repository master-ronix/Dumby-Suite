/**
 * CLAI (Command Line Administrative Interface) entry point — Tier 3.
 *
 * Hosts an SSH REPL that issues PEP commands on behalf of authenticated operators.
 * Authentication: SSH public-key only (Conflict 1 resolution — no password path,
 * no TOTP, no public exposure).
 *
 * ARCHITECTURE (Tier 3 — scaffolded with documented fast-follows):
 *   - Real SSH listener using the `ssh2` library on CLAI_PORT.
 *   - Public key auth against the `clai_operators` table (registered + non-revoked).
 *   - Session is a thin REPL over PowerEngineService — no logic of its own.
 *   - Every command is tagged with the operator's identity + correlationId.
 *   - Destructive actions require the operator to type the target name back.
 *
 * FAST-FOLLOWS (documented, not implemented here):
 *   - Per-session rate limiting.
 *   - Device binding (operator keypair → registered device check).
 *   - Break-glass runbook (CLAI_BREAK_GLASS_SCRIPT_URL).
 *
 * SECURITY NOTE: CLAI MUST NOT be exposed on a public-facing Service/Ingress.
 * Bind to CREDENTIALS_SERVICE_BIND_HOST (127.0.0.1 by default) and reach
 * it only via bastion, VPN, or an equivalent in-cluster-only path
 * (directive.md Rule 43.5 / blueprint.md §22.5).
 */

// PLACEHOLDER: ssh2 is not yet a declared dependency; install it before
// enabling this entry point for real use:
//   pnpm add ssh2 && pnpm add -D @types/ssh2
//
// The stub below starts a process that logs a clear "not yet operational"
// message rather than silently failing, so operators know the entry point
// exists and what it needs.

import { createLogger } from '../logging/logger.js';
import { parseEnv } from '../config/env.schema.js';

const env = parseEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);

logger.warn('clai-tier3-stub', {
  message:
    'CLAI SSH listener is a Tier-3 scaffold. ' +
    'Install ssh2, implement the ssh2-based listener in this file, ' +
    'and bind to CREDENTIALS_SERVICE_BIND_HOST. ' +
    'See apps/main/docs/adr/004-three-tier-scope.md.',
  bindHost: env.CREDENTIALS_SERVICE_BIND_HOST,
  port: env.CLAI_PORT,
});

// ADR reference: apps/main/docs/adr/004-three-tier-scope.md
// Open items: apps/main/docs/adr/005-open-items.md
