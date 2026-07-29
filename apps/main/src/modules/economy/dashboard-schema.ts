/**
 * Economy dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const EconomyDashboardSchema = {
  moduleSlug: 'economy',
  panels: [
    {
      id: 'economy-selftest-status',
      title: 'Economy status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
