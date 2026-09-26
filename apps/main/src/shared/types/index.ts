export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export type NonNullish<T> = T extends null | undefined ? never : T;

export type Brand<T, B> = T & { readonly __brand: B };

export type GuildId = Brand<string, 'GuildId'>;
export type UserId = Brand<string, 'UserId'>;
export type ModuleId = Brand<string, 'ModuleId'>;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface SoftDeletable {
  deletedAt: Date | null;
  deletedBy: string | null;
}
