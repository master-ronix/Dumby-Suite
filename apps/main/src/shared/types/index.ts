/**
 * Shared type utilities (Cluster: Core shared).
 */

/** Make all properties of T deeply readonly. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Non-nullable; strips null and undefined. */
export type NonNullish<T> = T extends null | undefined ? never : T;

/** Branded type helper — prevents ID types from being interchangeable. */
export type Brand<T, B> = T & { readonly __brand: B };

export type GuildId = Brand<string, 'GuildId'>;
export type UserId = Brand<string, 'UserId'>;
export type ModuleId = Brand<string, 'ModuleId'>;

/** The standard shape for all paginated list responses. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Audit trail fields attached to every entity update. */
export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/** Soft-delete fields. */
export interface SoftDeletable {
  deletedAt: Date | null;
  deletedBy: string | null;
}
