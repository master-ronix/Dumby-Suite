/**
 * AdminTierGateMiddleware logic (Cluster: Mash / Boot), extracted as a
 * pure function. Admin-tier actions bypass the normal seven-layer resolver
 * and the rest of the middleware pipeline entirely, but only for
 * BOT_OWNER_IDS. Two properties the spec calls out explicitly:
 *
 *  - Silent rejection: an unauthorized caller gets a generic "not found /
 *    not permitted" style response, never a message that reveals the
 *    action exists and is Admin-gated.
 *  - Every attempt (authorized or not) must be audited; the caller is
 *    responsible for writing the audit_logs row using the returned
 *    AdminTierGateResult, this function only decides allow/deny.
 */

export interface AdminTierGateResult {
  allowed: boolean;
  /** Always true for Admin tier: every attempt must produce an audit record. */
  mustAudit: true;
  /** Generic, non-revealing message safe to show to an unauthorized caller. */
  silentRejectionMessage: string;
}

const SILENT_REJECTION_MESSAGE = 'Unknown command.';

export function checkAdminTierGate(
  actorId: string,
  botOwnerIds: readonly string[],
): AdminTierGateResult {
  return {
    allowed: botOwnerIds.includes(actorId),
    mustAudit: true,
    silentRejectionMessage: SILENT_REJECTION_MESSAGE,
  };
}
