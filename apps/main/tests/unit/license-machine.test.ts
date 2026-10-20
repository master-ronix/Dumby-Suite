import { test, expect } from 'vitest';
import {
  LEGAL_LICENSE_TRANSITIONS,
  NON_TERMINAL_LICENSE_STATES,
  IllegalLicenseTransitionError,
  createPendingLicense,
  licenseAuthorizesDeploy,
  licenseAuthorizesTier,
  licenseMatchesManifestDevId,
  licensePermitsDeployment,
  revokeForMaliciousArtifact,
  suspendForSecurityFinding,
  transitionLicense,
  type LicenseRecord,
  type LicenseState,
} from '../../src/licensing/license-machine.js';

function approvedLicense(): LicenseRecord {
  return flowThroughApproval(createPendingLicense('lic_1', 'dev_alpha', 'admin'));
}

function flowThroughApproval(license: LicenseRecord): LicenseRecord {
  return transitionLicense(
    transitionLicense(license, 'under-review', { actor: 'owner' }),
    'approved',
    { actor: 'owner' },
  );
}

function approvedLicenseWithTier(
  tierClass: LicenseRecord['tierClass'],
  subjectDevId = 'dev_alpha',
): LicenseRecord {
  return flowThroughApproval(createPendingLicense('lic_1', subjectDevId, tierClass));
}

test('a new registration starts in pending and permits no deployment', () => {
  const license = createPendingLicense('lic_1', 'dev_alpha');
  expect(license.state).toBe('pending');
  expect(license.subjectDevId).toBe('dev_alpha');
  expect(licensePermitsDeployment(license.state)).toBe(false);
});

test('the full happy path traverses every legal edge', () => {
  const license = transitionLicense(
    transitionLicense(
      transitionLicense(
        transitionLicense(
          transitionLicense(createPendingLicense('lic_1', 'dev_alpha'), 'under-review', {
            actor: 'owner',
          }),
          'approved',
          { actor: 'owner' },
        ),
        'suspended',
        { actor: 'owner', reason: 'reviewing finding', forceDisable: true },
      ),
      'restored',
      { actor: 'owner' },
    ),
    'approved',
    { actor: 'owner' },
  );
  expect(license.state).toBe('approved');
  expect(license.approvedAt).toBeDefined();
  expect(license.suspendedAt).toBeUndefined();
  expect(license.suspensionReason).toBeUndefined();
});

test('every non-terminal state may transition to revoked; revoked is terminal', () => {
  for (const state of NON_TERMINAL_LICENSE_STATES) {
    const license: LicenseRecord = {
      licenseId: 'lic_1',
      subjectDevId: 'dev_alpha',
      tierClass: 'standard',
      state,
    };
    expect(LEGAL_LICENSE_TRANSITIONS[state]).toContain('revoked');
    expect(transitionLicense(license, 'revoked', { actor: 'owner' }).state).toBe('revoked');
  }
  expect(LEGAL_LICENSE_TRANSITIONS['revoked']).toHaveLength(0);
  const revoked = transitionLicense(
    transitionLicense(createPendingLicense('lic_1', 'dev_alpha'), 'under-review', {
      actor: 'owner',
    }),
    'revoked',
    { actor: 'owner', reason: 'malicious artifact' },
  );
  expect(revoked.state).toBe('revoked');
  expect(() => transitionLicense(revoked, 'approved', { actor: 'owner' })).toThrow(
    IllegalLicenseTransitionError,
  );
});

test('illegal edges throw and never change state', () => {
  const illegalEdges: ReadonlyArray<readonly [LicenseState, LicenseState]> = [
    ['pending', 'approved'],
    ['pending', 'suspended'],
    ['under-review', 'suspended'],
    ['approved', 'restored'],
    ['approved', 'pending'],
    ['suspended', 'approved'],
    ['restored', 'pending'],
  ];
  for (const [from, to] of illegalEdges) {
    const fixture: LicenseRecord = {
      licenseId: 'lic_1',
      subjectDevId: 'dev_alpha',
      tierClass: 'standard',
      state: from,
    };
    expect(() => transitionLicense(fixture, to, { actor: 'owner' })).toThrow(
      IllegalLicenseTransitionError,
    );
  }
});

test('suspended ⇄ restored is the temporary-intervention cycle', () => {
  const approved = transitionLicense(
    transitionLicense(createPendingLicense('lic_1', 'dev_alpha'), 'under-review', {
      actor: 'owner',
    }),
    'approved',
    { actor: 'owner' },
  );
  const suspended = transitionLicense(approved, 'suspended', {
    actor: 'owner',
    reason: 'confirmed security finding',
    forceDisable: true,
  });
  expect(suspended.state).toBe('suspended');
  expect(suspended.suspendedAt).toBeDefined();
  expect(suspended.suspensionReason).toBe('confirmed security finding');
  expect(suspended.forceDisabled).toBe(true);
  expect(licensePermitsDeployment(suspended.state)).toBe(false);

  const restored = transitionLicense(suspended, 'restored', { actor: 'owner' });
  expect(restored.state).toBe('restored');
  expect(restored.suspendedAt).toBeUndefined();
  expect(restored.suspensionReason).toBeUndefined();
  expect(restored.restoredAt).toBeDefined();
  expect(licensePermitsDeployment(restored.state)).toBe(false);

  const reSuspended = transitionLicense(restored, 'suspended', { actor: 'owner' });
  expect(reSuspended.state).toBe('suspended');
  expect(reSuspended.suspendedAt).toBeDefined();
});

test('automated triggers are explicit: security finding suspends, malicious artifact revokes', () => {
  const approved = transitionLicense(
    transitionLicense(createPendingLicense('lic_1', 'dev_alpha'), 'under-review', {
      actor: 'owner',
    }),
    'approved',
    { actor: 'owner' },
  );
  const suspended = suspendForSecurityFinding(approved, {
    actor: 'automation',
    reason: 'gate-3 finding',
    forceDisable: true,
  });
  expect(suspended.state).toBe('suspended');
  const revoked = revokeForMaliciousArtifact(suspended, { actor: 'automation' });
  expect(revoked.state).toBe('revoked');
  expect(revoked.revokedAt).toBeDefined();
});

test('only approved permits deployment and promotion', () => {
  const states: readonly LicenseState[] = [
    'pending',
    'under-review',
    'approved',
    'suspended',
    'restored',
    'revoked',
  ];
  expect(states.filter(licensePermitsDeployment)).toEqual(['approved']);
});

test('a license authorizes publication at its own tier and below', () => {
  const license = createPendingLicense('lic_1', 'dev_alpha', 'standard');
  expect(licenseAuthorizesTier(license, 'standard')).toBe(true);
  expect(licenseAuthorizesTier(license, 'marketplace')).toBe(true);
  expect(licenseAuthorizesTier(license, 'core')).toBe(false);
  expect(licenseAuthorizesTier(license, 'admin')).toBe(false);
  expect(licenseAuthorizesTier(license, 'unknown')).toBe(false);
});

test('devId-license binding: manifest devId must equal the license subject, fail closed', () => {
  const license = createPendingLicense('lic_1', 'dev_alpha');
  expect(licenseMatchesManifestDevId(license, 'dev_alpha')).toBe(true);
  expect(licenseMatchesManifestDevId(license, 'dev_beta')).toBe(false);
  expect(licenseMatchesManifestDevId(license, undefined)).toBe(false);
  expect(licenseMatchesManifestDevId(license, '')).toBe(false);
});

test('an admin-tier licence authorises the first-party modules (core + standard) — the boot-seed', () => {
  // UR-20261021-095 — the production boot-seed registers the first-party deployer (dev_first_party)
  // with an `admin`-tier licence, which must cover every first-party module tier. If it did not, the
  // seed's `/internal/deploy` calls would be refused and the tier volumes would stay empty.
  const admin = approvedLicenseWithTier('admin', 'dev_first_party');
  expect(
    licenseAuthorizesDeploy(admin, { manifestDevId: 'dev_first_party', moduleTier: 'core' }),
  ).toStrictEqual([]);
  expect(
    licenseAuthorizesDeploy(admin, { manifestDevId: 'dev_first_party', moduleTier: 'standard' }),
  ).toStrictEqual([]);
  // A narrower licence does NOT cover the core tier — the guard is real, not a formality.
  expect(
    licenseAuthorizesDeploy(approvedLicenseWithTier('standard', 'dev_first_party'), {
      manifestDevId: 'dev_first_party',
      moduleTier: 'core',
    }).length,
  ).toBeGreaterThan(0);
});

test('licenseAuthorizesDeploy combines state, binding, and tier', () => {
  expect(
    licenseAuthorizesDeploy(approvedLicense(), {
      manifestDevId: 'dev_alpha',
      moduleTier: 'standard',
    }),
  ).toEqual([]);
  expect(
    licenseAuthorizesDeploy(approvedLicense(), {
      manifestDevId: 'dev_beta',
      moduleTier: 'standard',
    }).length,
  ).toBeGreaterThan(0);
  expect(
    licenseAuthorizesDeploy(approvedLicense(), { manifestDevId: 'dev_alpha', moduleTier: 'admin' }),
  ).toEqual([]);

  const pending = createPendingLicense('lic_1', 'dev_alpha', 'core');
  const violations = licenseAuthorizesDeploy(pending, {
    manifestDevId: 'dev_alpha',
    moduleTier: 'core',
  });
  expect(violations).toContain('license state "pending" is not approved');
});

test('a marketplace license cannot authorize a core-tier module', () => {
  const violations = licenseAuthorizesDeploy(approvedLicenseWithTier('marketplace'), {
    manifestDevId: 'dev_alpha',
    moduleTier: 'core',
  });
  expect(violations.some((v) => v.includes('does not cover'))).toBe(true);
});
