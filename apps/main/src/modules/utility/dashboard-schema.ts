/**
 * Utility dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const UtilityDashboardSchema = {
  moduleSlug: 'utility',
  panels: [
    {
      id: 'utility-selftest-status',
      title: 'Utility status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
