/**
 * §15.8 "Module Ownership — the `modules` Table". Every published module slug has exactly one
 * owning developer. The first accepted upload of a fresh slug claims ownership; every subsequent
 * upload or deploy of that slug by a different developer is refused (403
 * `MODULE_UPLOAD_DENIED_NON_OWNER`) before validation, staging, or promotion runs. Ownership
 * transfer is an explicit operator action through the governance API, never a side effect of an
 * upload.
 */
export interface ModuleOwnershipRecord {
  readonly slug: string;
  readonly ownerDevId: string;
  readonly createdAt: Date;
  readonly ownershipTransferredAt: Date | null;
}

export type OwnershipDecision =
  | { readonly kind: 'claim' }
  | { readonly kind: 'owned' }
  | { readonly kind: 'denied'; readonly ownerDevId: string };

export function decideModuleOwnership(
  existing: ModuleOwnershipRecord | undefined,
  devId: string,
): OwnershipDecision {
  if (existing === undefined) return { kind: 'claim' };
  if (existing.ownerDevId === devId) return { kind: 'owned' };
  return { kind: 'denied', ownerDevId: existing.ownerDevId };
}

export interface ModuleOwnershipStore {
  findBySlug(slug: string): Promise<ModuleOwnershipRecord | undefined>;
  /** Insert the ownership row if the slug is unclaimed. Returns true when this call claimed it. */
  claim(slug: string, ownerDevId: string): Promise<boolean>;
  /** Operator-initiated ownership transfer (§44.8). Returns true when a row was updated. */
  transfer(slug: string, toDevId: string): Promise<boolean>;
}
