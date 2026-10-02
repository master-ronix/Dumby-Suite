/**
 * §15.8 "Deploy Authorization — Owner Approval, Never Auto-Approval" and §15.7's "transitions are
 * governed, never automatic". A developer reaches `approved` only when a project owner decides the
 * pending approval request through the governance API. The decision is refused when the actor is
 * the subject itself, an automation/service label, or an identity that is not a project owner —
 * the same three refusals §15.8's CHECK constraint encodes at the database boundary.
 */
export const APPROVAL_AUTOMATION_ACTORS = [
  'service',
  'automation',
  'credentials-service',
  'swastik',
] as const;

export type ApprovalDecision =
  | { readonly kind: 'approved' }
  | { readonly kind: 'declined' }
  | { readonly kind: 'refused'; readonly reason: string };

export function decideDeveloperApproval(input: {
  readonly actorId: string;
  readonly subjectDevId: string;
  readonly projectOwnerIds: readonly string[];
  readonly decision: 'approve' | 'decline';
}): ApprovalDecision {
  const actor = input.actorId.trim();
  if (actor.length === 0) return { kind: 'refused', reason: 'actorId is required' };
  if (actor === input.subjectDevId) {
    return { kind: 'refused', reason: 'a developer cannot decide their own approval' };
  }
  if ((APPROVAL_AUTOMATION_ACTORS as readonly string[]).includes(actor)) {
    return { kind: 'refused', reason: 'an automation or service may not decide an approval' };
  }
  if (!input.projectOwnerIds.includes(actor)) {
    return { kind: 'refused', reason: 'actor does not resolve to a project owner' };
  }
  return input.decision === 'approve' ? { kind: 'approved' } : { kind: 'declined' };
}
