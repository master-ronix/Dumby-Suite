/**
 * AutoModeration dashboardSchema — describes the one status panel MDIS renders
 * for this module. Pure data, no UI code (backend-only V1).
 */
export const AutoModerationDashboardSchema = {
  moduleSlug: 'auto-moderation',
  panels: [
    {
      id: 'auto-moderation-selftest-status',
      title: 'Auto Moderation status',
      fields: [
        { key: 'totalRuns', label: 'Self-test runs', type: 'number' },
        { key: 'lastRunAt', label: 'Last run', type: 'datetime' },
      ],
    },
  ],
} as const;
