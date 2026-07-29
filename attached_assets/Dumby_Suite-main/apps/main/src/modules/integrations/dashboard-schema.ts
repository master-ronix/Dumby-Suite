/**
 * Integrations dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const IntegrationsDashboardSchema = {
  moduleSlug: 'integrations',
  panels: [
    {
      id: 'integrations-selftest-status',
      title: 'Integrations status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
