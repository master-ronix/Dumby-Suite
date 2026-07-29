/**
 * Verification dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const VerificationDashboardSchema = {
  moduleSlug: 'verification',
  panels: [
    {
      id: 'verification-selftest-status',
      title: 'Verification status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
