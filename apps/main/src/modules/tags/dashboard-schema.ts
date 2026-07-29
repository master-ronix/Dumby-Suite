/**
 * Tags dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const TagsDashboardSchema = {
  moduleSlug: 'tags',
  panels: [
    {
      id: 'tags-selftest-status',
      title: 'Tags status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
