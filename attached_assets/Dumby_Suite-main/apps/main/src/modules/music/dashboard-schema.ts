/**
 * Music dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const MusicDashboardSchema = {
  moduleSlug: 'music',
  panels: [
    {
      id: 'music-selftest-status',
      title: 'Music status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
