/**
 * §15.8 "Owner Approval, Never Auto-Approval" / §22.5. A pending approval is decided only by an
 * identity that resolves to a project owner — a PEP operator in the independently-configured
 * operator allow-list — and never by the subject itself or by a service/automation. This is the
 * same three refusals the `approvals` table's CHECK constraint encodes at the database boundary.
 */
export const APPROVAL_SUBJECT_TYPES = ['developer', 'module', 'ownership_transfer'] as const;

export type ApprovalSubjectType = (typeof APPROVAL_SUBJECT_TYPES)[number];

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

export function decideApproval(input: {
  readonly actorId: string;
  readonly subjectType: ApprovalSubjectType;
  readonly subjectId: string;
  readonly operatorAllowList: readonly string[];
  readonly decision: 'approve' | 'decline';
}): ApprovalDecision {
  const actor = input.actorId.trim();
  if (actor.length === 0) return { kind: 'refused', reason: 'actorId is required' };
  if (actor === input.subjectId) {
    return { kind: 'refused', reason: 'the subject cannot decide its own approval' };
  }
  if ((APPROVAL_AUTOMATION_ACTORS as readonly string[]).includes(actor)) {
    return { kind: 'refused', reason: 'an automation or service may not decide an approval' };
  }
  if (!input.operatorAllowList.includes(actor)) {
    return { kind: 'refused', reason: 'actor is not in the PEP operator allow-list' };
  }
  return input.decision === 'approve' ? { kind: 'approved' } : { kind: 'declined' };
}
