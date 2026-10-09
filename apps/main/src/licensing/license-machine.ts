export const LICENSE_STATES = [
  'pending',
  'under-review',
  'approved',
  'suspended',
  'restored',
  'revoked',
] as const;

export type LicenseState = (typeof LICENSE_STATES)[number];

export const LICENSE_TIER_CLASSES = ['admin', 'core', 'standard', 'marketplace'] as const;

export type LicenseTierClass = (typeof LICENSE_TIER_CLASSES)[number];

export interface LicenseRecord {
  readonly licenseId: string;
  readonly subjectDevId: string;
  readonly tierClass: LicenseTierClass;
  readonly state: LicenseState;
  readonly approvedBy?: string;
  readonly approvedAt?: string;
  readonly suspendedBy?: string;
  readonly suspendedAt?: string;
  readonly suspensionReason?: string;
  readonly forceDisabled?: boolean;
  readonly restoredBy?: string;
  readonly restoredAt?: string;
  readonly revokedBy?: string;
  readonly revokedAt?: string;
  readonly revocationReason?: string;
  readonly verifiedFingerprint?: string;
}

export interface LicenseTransitionInput {
  readonly actor: string;
  readonly reason?: string;
  readonly forceDisable?: boolean;
}

export const LEGAL_LICENSE_TRANSITIONS: Readonly<Record<LicenseState, readonly LicenseState[]>> = {
  pending: ['under-review', 'revoked'],
  'under-review': ['approved', 'revoked'],
  approved: ['suspended', 'revoked'],
  suspended: ['restored', 'revoked'],
  restored: ['approved', 'suspended', 'revoked'],
  revoked: [],
};

export const NON_TERMINAL_LICENSE_STATES: ReadonlySet<LicenseState> = new Set([
  'pending',
  'under-review',
  'approved',
  'suspended',
  'restored',
]);

export class IllegalLicenseTransitionError extends Error {
  constructor(
    readonly licenseId: string,
    readonly from: LicenseState,
    readonly to: LicenseState,
  ) {
    super(`Illegal license transition on "${licenseId}": ${from} -> ${to}`);
    this.name = 'IllegalLicenseTransitionError';
  }
}

export class UnknownLicenseError extends Error {
  constructor(readonly licenseId: string) {
    super(`Unknown license "${licenseId}"`);
    this.name = 'UnknownLicenseError';
  }
}

export function licensePermitsDeployment(state: LicenseState): boolean {
  return state === 'approved';
}

function withOptional<T extends object, F extends Record<string, string | boolean | undefined>>(
  base: T,
  fields: F,
): T & Partial<F> {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T & Partial<F>;
}

function withoutKeys<T extends object, K extends keyof T>(
  obj: T,
  ...keys: readonly K[]
): Omit<T, K> {
  const out: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  for (const key of keys) delete out[key as string];
  return out as Omit<T, K>;
}

export function transitionLicense(
  license: LicenseRecord,
  to: LicenseState,
  input: LicenseTransitionInput,
): LicenseRecord {
  const legalTargets = LEGAL_LICENSE_TRANSITIONS[license.state];
  if (!legalTargets.includes(to)) {
    throw new IllegalLicenseTransitionError(license.licenseId, license.state, to);
  }
  const now = new Date().toISOString();
  if (to === 'approved') {
    return withOptional(
      withoutKeys(
        license,
        'revokedBy',
        'revokedAt',
        'revocationReason',
        'restoredBy',
        'restoredAt',
      ),
      { state: to, approvedBy: input.actor, approvedAt: now },
    );
  }
  if (to === 'suspended') {
    const cleared = withoutKeys(license, 'restoredBy', 'restoredAt');
    return withOptional(cleared, {
      state: to,
      suspendedBy: input.actor,
      suspendedAt: now,
      suspensionReason: input.reason,
      forceDisabled: input.forceDisable === true ? true : undefined,
    });
  }
  if (to === 'restored') {
    return withOptional(
      withoutKeys(license, 'suspendedBy', 'suspendedAt', 'suspensionReason', 'forceDisabled'),
      {
        state: to,
        restoredBy: input.actor,
        restoredAt: now,
      },
    );
  }
  if (to === 'revoked') {
    return withOptional(
      withoutKeys(license, 'suspendedBy', 'suspendedAt', 'suspensionReason', 'forceDisabled'),
      {
        state: to,
        revokedBy: input.actor,
        revokedAt: now,
        revocationReason: input.reason,
      },
    );
  }
  return { ...license, state: to };
}

export function suspendForSecurityFinding(
  license: LicenseRecord,
  input: LicenseTransitionInput,
): LicenseRecord {
  return transitionLicense(license, 'suspended', input);
}

export function revokeForMaliciousArtifact(
  license: LicenseRecord,
  input: LicenseTransitionInput,
): LicenseRecord {
  return transitionLicense(license, 'revoked', input);
}

const TIER_CLASS_RANK: Readonly<Record<LicenseTierClass, number>> = {
  admin: 4,
  core: 3,
  standard: 2,
  marketplace: 1,
};

export function licenseAuthorizesTier(license: LicenseRecord, declaredTier: string): boolean {
  const declaredRank = TIER_CLASS_RANK[declaredTier as LicenseTierClass];
  if (declaredRank === undefined) return false;
  return declaredRank <= TIER_CLASS_RANK[license.tierClass];
}

export function licenseMatchesManifestDevId(
  license: LicenseRecord,
  manifestDevId: string | undefined,
): boolean {
  return (
    typeof manifestDevId === 'string' &&
    manifestDevId.length > 0 &&
    manifestDevId === license.subjectDevId
  );
}

export function licenseAuthorizesDeploy(
  license: LicenseRecord,
  declaration: {
    readonly manifestDevId: string | undefined;
    readonly moduleTier: string;
  },
): readonly string[] {
  const violations: string[] = [];
  if (!licensePermitsDeployment(license.state)) {
    violations.push(`license state "${license.state}" is not approved`);
  }
  if (!licenseMatchesManifestDevId(license, declaration.manifestDevId)) {
    violations.push('manifest devId does not equal the license subject');
  }
  if (!licenseAuthorizesTier(license, declaration.moduleTier)) {
    violations.push(
      `license tier class "${license.tierClass}" does not cover declared tier "${declaration.moduleTier}"`,
    );
  }
  return violations;
}

export function createPendingLicense(
  licenseId: string,
  subjectDevId: string,
  tierClass: LicenseTierClass = 'standard',
): LicenseRecord {
  return {
    licenseId,
    subjectDevId,
    tierClass,
    state: 'pending',
  };
}
