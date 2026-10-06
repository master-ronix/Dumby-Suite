export interface AdminTierGateResult {
  allowed: boolean;
  mustAudit: true;
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
