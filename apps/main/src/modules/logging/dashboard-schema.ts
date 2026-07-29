/**
 * Logging dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const LoggingDashboardSchema = {
  moduleSlug: 'logging',
  panels: [
    {
      id: 'logging-selftest-status',
      title: 'Logging status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
